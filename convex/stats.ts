import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// Build slug -> name and slug -> top-level parent slug maps for a user's
// categories. Shared by the breakdown and drill-down queries.
async function buildCategoryMaps(ctx: QueryCtx, userId: Id<"users">) {
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

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
  return { slugToName, slugToParentSlug };
}

// Drill-down for a single top-level category in a date range: the breakdown by
// sub-category plus every individual expense line item that rolls up into it.
export const getCategoryDetail = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    parentSlug: v.string(),
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

    const { slugToName, slugToParentSlug } = await buildCategoryMaps(
      ctx,
      args.userId
    );

    const subTotals = new Map<string, { total: number; itemCount: number }>();
    const items: {
      productName: string;
      quantity: number;
      total: number;
      date: number;
      storeName: string;
      receiptId: Id<"receipts">;
      subSlug: string;
      subName: string;
    }[] = [];

    for (const receipt of receipts) {
      const receiptItems = await ctx.db
        .query("receiptItems")
        .withIndex("by_receipt", (q) => q.eq("receiptId", receipt._id))
        .collect();

      for (const item of receiptItems) {
        const rawSlug = item.category ?? "uncategorized";
        const parentSlug = slugToParentSlug.get(rawSlug) ?? rawSlug;
        if (parentSlug !== args.parentSlug) continue;

        const amount = item.price * item.quantity;
        const subName = slugToName.get(rawSlug) ?? "Uncategorized";
        const existing = subTotals.get(rawSlug) ?? { total: 0, itemCount: 0 };
        subTotals.set(rawSlug, {
          total: existing.total + amount,
          itemCount: existing.itemCount + 1,
        });
        items.push({
          productName: item.productName,
          quantity: item.quantity,
          total: amount,
          date: receipt.date,
          storeName: receipt.storeName,
          receiptId: receipt._id,
          subSlug: rawSlug,
          subName,
        });
      }
    }

    return {
      subcategories: Array.from(subTotals.entries())
        .map(([slug, data]) => ({
          slug,
          name: slugToName.get(slug) ?? "Uncategorized",
          total: data.total,
          itemCount: data.itemCount,
        }))
        .sort((a, b) => b.total - a.total),
      items: items.sort((a, b) => b.total - a.total),
    };
  },
});

// Total spend per calendar month across a date range. Returns one entry for
// every month in [startDate, endDate), including months with zero spend, so the
// trend chart shows an unbroken timeline.
export const getMonthlyTrend = query({
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

    // Seed a bucket for every month in the range.
    const buckets = new Map<string, { year: number; month: number; total: number }>();
    const cursor = new Date(args.startDate);
    cursor.setDate(1);
    const end = new Date(args.endDate);
    while (cursor.getTime() < end.getTime()) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      buckets.set(`${year}-${month}`, { year, month, total: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const receipt of receipts) {
      const d = new Date(receipt.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.total += receipt.total;
    }

    return Array.from(buckets.values()).sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year
    );
  },
});
