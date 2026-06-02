import { v } from "convex/values";
import { query } from "./_generated/server";

export const getCategoryBreakdown = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", args.startDate)
          .lt("date", args.endDate)
      )
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build slug -> display name + top-level parent slug
    const slugToName = new Map<string, string>();
    const slugToParentSlug = new Map<string, string>();
    for (const cat of categories) {
      slugToName.set(cat.slug, cat.name);
    }
    for (const cat of categories) {
      if (cat.parentId) {
        const parent = categories.find((c) => c._id === cat.parentId);
        if (parent) slugToParentSlug.set(cat.slug, parent.slug);
      }
    }

    const totals = new Map<string, { total: number; itemCount: number }>();
    let grandTotal = 0;

    for (const receipt of receipts) {
      const items = await ctx.db
        .query("receiptItems")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .collect();

      for (const item of items) {
        // Roll subcategories up into their parent so the pie chart isn't a sea of slivers
        const rawSlug = item.category ?? "uncategorized";
        const slug = slugToParentSlug.get(rawSlug) ?? rawSlug;
        const amount = item.price * item.quantity;
        const existing = totals.get(slug) ?? { total: 0, itemCount: 0 };
        totals.set(slug, {
          total: existing.total + amount,
          itemCount: existing.itemCount + 1,
        });
        grandTotal += amount;
      }
    }

    return {
      grandTotal,
      categories: Array.from(totals.entries())
        .map(([slug, data]) => ({
          slug,
          name: slugToName.get(slug) ?? "Uncategorized",
          total: data.total,
          itemCount: data.itemCount,
          percent: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total),
    };
  },
});
