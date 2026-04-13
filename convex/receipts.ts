import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createReceipt = mutation({
  args: {
    userId: v.id("users"),
    storeName: v.string(),
    storeAddress: v.optional(v.string()),
    date: v.number(),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.number(),
    imageId: v.optional(v.id("_storage")),
    fileMimeType: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    isManualEntry: v.boolean(),
    items: v.array(
      v.object({
        productName: v.string(),
        price: v.number(),
        quantity: v.number(),
        category: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { items, ...receiptData } = args;

    // Create the receipt
    const receiptId = await ctx.db.insert("receipts", {
      ...receiptData,
      createdAt: Date.now(),
    });

    // Create receipt items and track prices
    for (const item of items) {
      const normalizedName = item.productName.toLowerCase().trim();

      // Find or create product
      let product = await ctx.db
        .query("products")
        .withIndex("by_user_normalized", (q) =>
          q.eq("userId", args.userId).eq("normalizedName", normalizedName)
        )
        .first();

      let productId = product?._id;

      if (!product) {
        productId = await ctx.db.insert("products", {
          name: item.productName,
          normalizedName,
          category: item.category,
          userId: args.userId,
          createdAt: Date.now(),
        });
      }

      // Create receipt item
      const receiptItemId = await ctx.db.insert("receiptItems", {
        receiptId,
        userId: args.userId,
        productName: item.productName,
        normalizedName,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        productId,
      });

      // Create price history entry
      if (productId) {
        await ctx.db.insert("priceHistory", {
          productId,
          receiptId,
          receiptItemId,
          storeName: args.storeName,
          price: item.price,
          date: args.date,
          userId: args.userId,
        });
      }
    }

    return receiptId;
  },
});

export const getReceipts = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Get items count for each receipt
    const receiptsWithCounts = await Promise.all(
      receipts.map(async (receipt) => {
        const items = await ctx.db
          .query("receiptItems")
          .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
          .collect();
        return {
          ...receipt,
          itemCount: items.length,
        };
      })
    );

    return receiptsWithCounts;
  },
});

export const getReceiptById = query({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const items = await ctx.db
      .query("receiptItems")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .collect();

    // Get image URL if exists
    let imageUrl = null;
    if (receipt.imageId) {
      imageUrl = await ctx.storage.getUrl(receipt.imageId);
    }

    return {
      ...receipt,
      imageUrl,
      fileMimeType: receipt.fileMimeType ?? null,
      items,
    };
  },
});

export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    // Delete related items
    const items = await ctx.db
      .query("receiptItems")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .collect();

    for (const item of items) {
      // Delete price history for this item
      const priceHistories = await ctx.db
        .query("priceHistory")
        .filter((q) => q.eq(q.field("receiptItemId"), item._id))
        .collect();

      for (const ph of priceHistories) {
        await ctx.db.delete(ph._id);
      }

      await ctx.db.delete(item._id);
    }

    // Delete image if exists
    if (receipt.imageId) {
      await ctx.storage.delete(receipt.imageId);
    }

    // Delete receipt
    await ctx.db.delete(args.receiptId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getReceiptStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);
    const thisMonthReceipts = receipts.filter((r) => r.date >= thisMonth);
    const lastMonthReceipts = receipts.filter(
      (r) => r.date >= lastMonth && r.date < thisMonth
    );

    const thisMonthTotal = thisMonthReceipts.reduce((sum, r) => sum + r.total, 0);
    const lastMonthTotal = lastMonthReceipts.reduce((sum, r) => sum + r.total, 0);

    // Get spending by store
    const byStore: Record<string, number> = {};
    for (const receipt of receipts) {
      byStore[receipt.storeName] = (byStore[receipt.storeName] ?? 0) + receipt.total;
    }

    const topStores = Object.entries(byStore)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    return {
      totalSpent,
      receiptCount: receipts.length,
      thisMonthTotal,
      lastMonthTotal,
      monthlyChange:
        lastMonthTotal > 0
          ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
          : 0,
      topStores,
    };
  },
});
