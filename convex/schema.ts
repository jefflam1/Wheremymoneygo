import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  receipts: defineTable({
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
    currency: v.optional(v.string()),
    isManualEntry: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_store", ["userId", "storeName"]),

  receiptItems: defineTable({
    receiptId: v.id("receipts"),
    userId: v.id("users"),
    productName: v.string(),
    normalizedName: v.string(),
    price: v.number(),
    quantity: v.number(),
    category: v.optional(v.string()),
    productId: v.optional(v.id("products")),
  })
    .index("by_receipt", ["receiptId"])
    .index("by_user", ["userId"])
    .index("by_product", ["productId"]),

  products: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    category: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_normalized", ["userId", "normalizedName"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("categories")),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentId"])
    .index("by_user_slug", ["userId", "slug"]),

  priceHistory: defineTable({
    productId: v.id("products"),
    receiptId: v.id("receipts"),
    receiptItemId: v.id("receiptItems"),
    storeName: v.string(),
    price: v.number(),
    date: v.number(),
    userId: v.id("users"),
  })
    .index("by_product", ["productId"])
    .index("by_product_store", ["productId", "storeName"])
    .index("by_user", ["userId"]),
});
