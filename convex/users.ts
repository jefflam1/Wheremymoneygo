import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createOrGetUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update user info if changed
      if (
        existingUser.email !== args.email ||
        existingUser.name !== args.name ||
        existingUser.imageUrl !== args.imageUrl
      ) {
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          name: args.name,
          imageUrl: args.imageUrl,
        });
      }
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Dev-only: returns any user in the DB. Used when NEXT_PUBLIC_DISABLE_AUTH=true
// so the dashboard can render on mobile without going through Clerk.
export const getAnyUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").first();
  },
});

export const updateCurrency = mutation({
  args: {
    userId: v.id("users"),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { currency: args.currency });
  },
});
