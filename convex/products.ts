import { v } from "convex/values";
import { query } from "./_generated/server";

export const getProducts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const products = await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Get price info for each product
    const productsWithPrices = await Promise.all(
      products.map(async (product) => {
        const priceHistory = await ctx.db
          .query("priceHistory")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .collect();

        if (priceHistory.length === 0) {
          return {
            ...product,
            latestPrice: 0,
            lowestPrice: 0,
            highestPrice: 0,
            priceCount: 0,
            stores: [],
          };
        }

        const prices = priceHistory.map((ph) => ph.price);
        const stores = [...new Set(priceHistory.map((ph) => ph.storeName))];

        return {
          ...product,
          latestPrice: priceHistory[0].price,
          lowestPrice: Math.min(...prices),
          highestPrice: Math.max(...prices),
          avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
          priceCount: priceHistory.length,
          stores,
        };
      })
    );

    return productsWithPrices;
  },
});

export const searchProducts = query({
  args: {
    userId: v.id("users"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      return [];
    }

    const products = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.searchTerm).eq("userId", args.userId)
      )
      .take(20);

    return products;
  },
});

export const getProductById = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();

    // Group by store
    const byStore: Record<
      string,
      { prices: { price: number; date: number }[]; latest: number; lowest: number }
    > = {};

    for (const ph of priceHistory) {
      if (!byStore[ph.storeName]) {
        byStore[ph.storeName] = { prices: [], latest: 0, lowest: Infinity };
      }
      byStore[ph.storeName].prices.push({ price: ph.price, date: ph.date });
      if (byStore[ph.storeName].latest === 0) {
        byStore[ph.storeName].latest = ph.price;
      }
      if (ph.price < byStore[ph.storeName].lowest) {
        byStore[ph.storeName].lowest = ph.price;
      }
    }

    const storeComparison = Object.entries(byStore)
      .map(([storeName, data]) => ({
        storeName,
        latestPrice: data.latest,
        lowestPrice: data.lowest,
        priceHistory: data.prices.slice(0, 10), // Last 10 prices
      }))
      .sort((a, b) => a.latestPrice - b.latestPrice);

    const allPrices = priceHistory.map((ph) => ph.price);

    return {
      ...product,
      priceHistory: priceHistory.slice(0, 20),
      storeComparison,
      stats: {
        avgPrice: allPrices.length > 0
          ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
          : 0,
        lowestPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
        highestPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
        totalPurchases: priceHistory.length,
      },
    };
  },
});

export const getPriceComparison = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get products with price variations across stores
    const products = await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const comparisons = await Promise.all(
      products.map(async (product) => {
        const priceHistory = await ctx.db
          .query("priceHistory")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        const storeMap: Record<string, number[]> = {};
        for (const ph of priceHistory) {
          if (!storeMap[ph.storeName]) {
            storeMap[ph.storeName] = [];
          }
          storeMap[ph.storeName].push(ph.price);
        }

        const stores = Object.keys(storeMap);
        if (stores.length < 2) return null; // Only show products with multiple stores

        const storeAvgPrices = stores.map((store) => ({
          store,
          avgPrice:
            storeMap[store].reduce((a, b) => a + b, 0) / storeMap[store].length,
          latestPrice: storeMap[store][storeMap[store].length - 1],
        }));

        storeAvgPrices.sort((a, b) => a.avgPrice - b.avgPrice);

        const cheapest = storeAvgPrices[0];
        const mostExpensive = storeAvgPrices[storeAvgPrices.length - 1];
        const savings = mostExpensive.avgPrice - cheapest.avgPrice;
        const savingsPercent = (savings / mostExpensive.avgPrice) * 100;

        return {
          productId: product._id,
          productName: product.name,
          category: product.category,
          stores: storeAvgPrices,
          cheapestStore: cheapest.store,
          potentialSavings: savings,
          savingsPercent,
        };
      })
    );

    return comparisons
      .filter((c) => c !== null)
      .sort((a, b) => b.savingsPercent - a.savingsPercent);
  },
});
