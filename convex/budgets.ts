import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBudgets = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Upsert a budget. Pass no categorySlug to set the overall monthly budget.
// An amount <= 0 clears the budget instead of storing it.
export const setBudget = mutation({
  args: {
    userId: v.id("users"),
    categorySlug: v.optional(v.string()),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const match = existing.find((b) => b.categorySlug === args.categorySlug);

    if (args.amount <= 0) {
      if (match) await ctx.db.delete(match._id);
      return;
    }

    if (match) {
      await ctx.db.patch(match._id, { amount: args.amount });
    } else {
      await ctx.db.insert("budgets", {
        userId: args.userId,
        categorySlug: args.categorySlug,
        amount: args.amount,
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteBudget = mutation({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.budgetId);
  },
});
