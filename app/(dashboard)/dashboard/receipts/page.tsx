"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  Store,
  PlusCircle,
  Search,
  Calendar,
  Camera,
  Edit,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";
import { isReconciled } from "@/lib/receipt-utils";

export default function ReceiptsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");

  const receipts = useQuery(
    api.receipts.getReceiptsWithItems,
    user?._id ? { userId: user._id, limit: 100 } : "skip"
  );

  const query = searchTerm.trim().toLowerCase();

  // A receipt matches on its store name or on any item it contains. We keep the
  // matching items so the card can show which ones were hit.
  const filteredReceipts = receipts
    ?.map((receipt) => {
      if (!query) return { ...receipt, matchedItems: [] };
      const storeMatch = receipt.storeName.toLowerCase().includes(query);
      const matchedItems = receipt.items.filter((item) =>
        item.productName.toLowerCase().includes(query)
      );
      if (!storeMatch && matchedItems.length === 0) return null;
      return { ...receipt, matchedItems };
    })
    .filter((receipt) => receipt !== null);

  if (userLoading) {
    return <ReceiptsPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6">
        <p>Please sign in to view receipts.</p>
      </div>
    );
  }

  const currency = user.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">Receipts</h1>
          <p className="text-sm text-muted-foreground">
            {query
              ? `${filteredReceipts?.length ?? 0} of ${receipts?.length ?? 0} receipts`
              : `${receipts?.length ?? 0} receipts tracked`}
          </p>
        </div>
        <Button render={<Link href="/dashboard/receipts/new" />} className="hidden sm:inline-flex">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Receipt
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by store or item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Receipts List */}
      {!receipts ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredReceipts?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {searchTerm ? (
              <>
                <p className="text-muted-foreground mb-4">
                  No receipts found matching &quot;{searchTerm}&quot;
                </p>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t added any receipts yet
                </p>
                <Button render={<Link href="/dashboard/receipts/new" />}>
                  Add Your First Receipt
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReceipts?.map((receipt) => (
            <Link
              key={receipt._id}
              href={`/dashboard/receipts/${receipt._id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate min-w-0">
                            {receipt.storeName}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {receipt.isManualEntry ? (
                              <>
                                <Edit className="h-3 w-3 mr-1" />
                                Manual
                              </>
                            ) : (
                              <>
                                <Camera className="h-3 w-3 mr-1" />
                                Scanned
                              </>
                            )}
                          </Badge>
                          {!isReconciled(receipt) && (
                            <Badge
                              variant="outline"
                              className="text-xs text-amber-600 border-amber-500/50"
                              title="Subtotal, discount and tax don't add up to the total"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Check totals
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(receipt.date).toLocaleDateString()}
                          </span>
                          <span>{receipt.items.length} items</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-lg font-bold shrink-0">
                      {formatMoney(receipt.total, receipt.currency ?? currency)}
                    </p>
                  </div>

                  {/* Items that matched the search, so it's clear why this
                      receipt is in the results. */}
                  {receipt.matchedItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {receipt.matchedItems.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="flex-1 min-w-0 truncate">
                            {item.productName}
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground">
                                {" "}
                                x{item.quantity}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatMoney(
                              item.price,
                              receipt.currency ?? currency
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptsPageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
