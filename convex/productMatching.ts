import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  namesLikelySameProduct,
  normalizeProductName,
} from "../lib/product-matching";

export { namesLikelySameProduct, normalizeProductName };

// Loads the user's products once and answers match/create requests for every
// line item on a receipt. Matches against the *recomputed* normalization of
// each product's display name, so records saved under the old
// lowercase-and-trim scheme still get exact hits.
export async function buildProductMatcher(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const byNormalized = new Map<string, Doc<"products">>();
  for (const product of products) {
    byNormalized.set(normalizeProductName(product.name), product);
  }

  return {
    findMatch(productName: string): Doc<"products"> | null {
      const exact = byNormalized.get(normalizeProductName(productName));
      if (exact) return exact;
      for (const product of byNormalized.values()) {
        if (namesLikelySameProduct(productName, product.name)) return product;
      }
      return null;
    },

    async findOrCreate(
      productName: string,
      category: string | undefined
    ): Promise<Id<"products">> {
      const match = this.findMatch(productName);
      if (match) return match._id;

      const productId = await ctx.db.insert("products", {
        name: productName,
        normalizedName: normalizeProductName(productName),
        category,
        userId,
        createdAt: Date.now(),
      });
      const created = await ctx.db.get(productId);
      if (created) {
        byNormalized.set(normalizeProductName(productName), created);
      }
      return productId;
    },
  };
}
