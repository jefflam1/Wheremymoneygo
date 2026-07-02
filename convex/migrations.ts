import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  namesLikelySameProduct,
  normalizeProductName,
} from "./productMatching";

// One-off cleanup after switching product matching to normalizeProductName +
// fuzzy matching (see productMatching.ts). Re-normalizes every product under
// the current scheme and merges products the matcher now considers the same,
// repointing their receipt items and price history at the oldest record.
//
// Run with `npx convex run migrations:mergeDuplicateProducts` to preview the
// merges, then pass '{"apply": true}' to execute them.
export const mergeDuplicateProducts = internalMutation({
  args: { apply: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const apply = args.apply ?? false;
    const allProducts = await ctx.db.query("products").collect();

    const byUser = new Map<string, typeof allProducts>();
    for (const product of allProducts) {
      const list = byUser.get(product.userId) ?? [];
      list.push(product);
      byUser.set(product.userId, list);
    }

    const merges: { kept: string; merged: string[] }[] = [];
    let mergedCount = 0;

    for (const products of byUser.values()) {
      // Oldest first, so the earliest record becomes the canonical one.
      products.sort((a, b) => a.createdAt - b.createdAt);
      const canonicals: typeof products = [];

      for (const product of products) {
        const target = canonicals.find((canonical) =>
          namesLikelySameProduct(canonical.name, product.name)
        );

        if (!target) {
          canonicals.push(product);
          const normalized = normalizeProductName(product.name);
          if (apply && normalized !== product.normalizedName) {
            await ctx.db.patch(product._id, { normalizedName: normalized });
          }
          continue;
        }

        mergedCount++;
        let entry = merges.find((m) => m.kept === target.name);
        if (!entry) {
          entry = { kept: target.name, merged: [] };
          merges.push(entry);
        }
        entry.merged.push(product.name);

        if (apply) {
          const items = await ctx.db
            .query("receiptItems")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .collect();
          for (const item of items) {
            await ctx.db.patch(item._id, { productId: target._id });
          }

          const history = await ctx.db
            .query("priceHistory")
            .withIndex("by_product", (q) => q.eq("productId", product._id))
            .collect();
          for (const ph of history) {
            await ctx.db.patch(ph._id, { productId: target._id });
          }

          await ctx.db.delete(product._id);
        }
      }
    }

    return { apply, productCount: allProducts.length, mergedCount, merges };
  },
});
