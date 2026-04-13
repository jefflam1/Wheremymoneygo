"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Search,
  TrendingDown,
  Store,
  ArrowRight,
  DollarSign,
} from "lucide-react";

export default function ProductsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");

  const products = useQuery(
    api.products.getProducts,
    user?._id ? { userId: user._id, limit: 100 } : "skip"
  );

  const priceComparisons = useQuery(
    api.products.getPriceComparison,
    user?._id ? { userId: user._id } : "skip"
  );

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userLoading) {
    return <ProductsPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6">
        <p>Please sign in to view the price library.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Price Library</h1>
        <p className="text-muted-foreground">
          Track prices and find the best deals across stores
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">All Products</TabsTrigger>
          <TabsTrigger value="compare">Price Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Products List */}
          {!products ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredProducts?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {searchTerm ? (
                  <p className="text-muted-foreground">
                    No products found matching &quot;{searchTerm}&quot;
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Products will appear here as you add receipts
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts?.map((product) => (
                <Link
                  key={product._id}
                  href={`/dashboard/products/${product._id}`}
                >
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate mb-2">
                        {product.name}
                      </h3>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs mb-3">
                          {product.category}
                        </Badge>
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Latest:</span>
                          <span className="font-medium">
                            ${product.latestPrice.toFixed(2)}
                          </span>
                        </div>
                        {product.priceCount > 1 && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lowest:</span>
                              <span className="text-green-600 font-medium">
                                ${product.lowestPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Highest:</span>
                              <span className="text-red-500 font-medium">
                                ${product.highestPrice.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                          <Store className="h-3 w-3" />
                          {product.stores.length} store
                          {product.stores.length !== 1 ? "s" : ""}
                          <span className="mx-1">&middot;</span>
                          {product.priceCount} purchase
                          {product.priceCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          {!priceComparisons ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : priceComparisons.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Price comparisons will appear when you buy the same product at
                  different stores
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Products you&apos;ve bought at multiple stores, sorted by
                potential savings
              </p>
              {priceComparisons.map((comparison) => (
                <Link
                  key={comparison.productId}
                  href={`/dashboard/products/${comparison.productId}`}
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {comparison.productName}
                          </h3>
                          {comparison.category && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {comparison.category}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="default"
                            className="bg-green-600 hover:bg-green-600"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Save {comparison.savingsPercent.toFixed(0)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            up to ${comparison.potentialSavings.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {comparison.stores.slice(0, 3).map((store, index) => (
                          <div
                            key={store.store}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-green-600 border-green-600"
                                >
                                  Best
                                </Badge>
                              )}
                              <span
                                className={
                                  index === 0
                                    ? "font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {store.store}
                              </span>
                            </div>
                            <span
                              className={
                                index === 0
                                  ? "font-semibold text-green-600"
                                  : ""
                              }
                            >
                              ${store.avgPrice.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {comparison.stores.length > 3 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            +{comparison.stores.length - 3} more stores
                            <ArrowRight className="h-3 w-3" />
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
