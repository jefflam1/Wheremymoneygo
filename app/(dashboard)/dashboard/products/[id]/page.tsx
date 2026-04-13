"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Store,
  Calendar,
  DollarSign,
} from "lucide-react";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const product = useQuery(api.products.getProductById, {
    productId: id as Id<"products">,
  });

  if (product === undefined) {
    return <ProductDetailSkeleton />;
  }

  if (product === null) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Product not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceTrend =
    product.priceHistory.length >= 2
      ? product.priceHistory[0].price - product.priceHistory[1].price
      : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Price Library
      </Button>

      {/* Product Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {product.category && (
                <Badge variant="secondary" className="mt-1">
                  {product.category}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Average Price"
          value={`$${product.stats.avgPrice.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Lowest Price"
          value={`$${product.stats.lowestPrice.toFixed(2)}`}
          icon={TrendingDown}
          className="text-green-600"
        />
        <StatsCard
          title="Highest Price"
          value={`$${product.stats.highestPrice.toFixed(2)}`}
          icon={TrendingUp}
          className="text-red-500"
        />
        <StatsCard
          title="Total Purchases"
          value={product.stats.totalPurchases.toString()}
          icon={Store}
        />
      </div>

      {/* Store Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price by Store</CardTitle>
        </CardHeader>
        <CardContent>
          {product.storeComparison.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No price data available yet
            </p>
          ) : (
            <div className="space-y-4">
              {product.storeComparison.map((store, index) => {
                const isBest = index === 0;
                const priceRange =
                  product.stats.highestPrice - product.stats.lowestPrice;
                const position =
                  priceRange > 0
                    ? ((store.latestPrice - product.stats.lowestPrice) /
                        priceRange) *
                      100
                    : 50;

                return (
                  <div key={store.storeName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{store.storeName}</span>
                        {isBest && (
                          <Badge className="bg-green-600 hover:bg-green-600 text-xs">
                            Best Price
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${isBest ? "text-green-600" : ""}`}
                        >
                          ${store.latestPrice.toFixed(2)}
                        </span>
                        {store.lowestPrice !== store.latestPrice && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (low: ${store.lowestPrice.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 h-full rounded-full ${
                          isBest ? "bg-green-600" : "bg-primary"
                        }`}
                        style={{
                          width: `${100 - position}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Recent Price History
            {priceTrend !== 0 && (
              <Badge
                variant={priceTrend > 0 ? "destructive" : "default"}
                className={
                  priceTrend < 0 ? "bg-green-600 hover:bg-green-600" : ""
                }
              >
                {priceTrend > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +${priceTrend.toFixed(2)}
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -${Math.abs(priceTrend).toFixed(2)}
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.priceHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No price history available
            </p>
          ) : (
            <div className="divide-y">
              {product.priceHistory.map((entry, index) => (
                <div
                  key={`${entry.date}-${index}`}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{entry.storeName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">${entry.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className={`h-4 w-4 text-muted-foreground ${className ?? ""}`} />
        </div>
        <p className={`text-xl font-bold mt-1 ${className ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-20 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
