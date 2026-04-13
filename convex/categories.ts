import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_CATEGORIES = [
  { name: "Groceries", slug: "groceries" },
  { name: "Food & Dining", slug: "food" },
  { name: "Household", slug: "household" },
  { name: "Electronics", slug: "electronics" },
  { name: "Clothing", slug: "clothing" },
  { name: "Health & Beauty", slug: "health" },
  { name: "Entertainment", slug: "entertainment" },
  { name: "Other", slug: "other" },
];

export const getCategories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build tree: top-level categories with nested children
    const parents = all
      .filter((c) => !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return parents.map((parent) => ({
      ...parent,
      children: all
        .filter((c) => c.parentId === parent._id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  },
});

export const seedDefaultCategories = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check if user already has categories
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) return;

    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      await ctx.db.insert("categories", {
        userId: args.userId,
        name: cat.name,
        slug: cat.slug,
        sortOrder: i,
        createdAt: Date.now(),
      });
    }
  },
});

export const createCategory = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const slug = args.name.toLowerCase().trim().replace(/\s+/g, "-");

    // Check for duplicate slug under same parent
    const all = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const siblings = all.filter((c) =>
      args.parentId ? c.parentId === args.parentId : !c.parentId
    );

    const duplicate = siblings.find((c) => c.slug === slug);
    if (duplicate) throw new Error(`Category "${args.name}" already exists`);

    const maxOrder = siblings.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      -1
    );

    return await ctx.db.insert("categories", {
      userId: args.userId,
      name: args.name.trim(),
      slug,
      parentId: args.parentId,
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    await ctx.db.patch(args.categoryId, {
      name: args.name.trim(),
      // Keep slug stable to avoid breaking existing receipt items
    });
  },
});

export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Category not found");

    // If parent, delete all children first
    if (!category.parentId) {
      const children = await ctx.db
        .query("categories")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", category.userId).eq("parentId", args.categoryId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.delete(child._id);
      }
    }

    await ctx.db.delete(args.categoryId);
  },
});
