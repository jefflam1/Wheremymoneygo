"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useCurrentUser();

  const stats = useQuery(
    api.receipts.getReceiptStats,
    user?._id ? { userId: user._id } : "skip"
  );

  const recentReceipts = useQuery(
    api.receipts.getReceipts,
    user?._id ? { userId: user._id, limit: 5 } : "skip"
  );

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="p-4 md:p-6">
        <p>Loading user data...</p>
      </div>
    );
  }

  const currency = user.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s your spending overview.
          </p>
        </div>
        <Button render={<Link href="/dashboard/receipts/new" />} className="sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Receipt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Spent"
          value={stats ? formatMoney(stats.totalSpent, currency) : formatMoney(0, currency)}
          icon={DollarSign}
          loading={!stats}
        />
        <StatsCard
          title="This Month"
          value={stats ? formatMoney(stats.thisMonthTotal, currency) : formatMoney(0, currency)}
          icon={stats && stats.monthlyChange >= 0 ? TrendingUp : TrendingDown}
          subtitle={
            stats
              ? `${stats.monthlyChange >= 0 ? "+" : ""}${stats.monthlyChange.toFixed(0)}% from last month`
              : undefined
          }
          loading={!stats}
        />
        <StatsCard
          title="Receipts"
          value={stats?.receiptCount.toString() ?? "0"}
          icon={Receipt}
          loading={!stats}
        />
        <StatsCard
          title="Top Store"
          value={stats?.topStores[0]?.name ?? "None"}
          icon={Store}
          subtitle={
            stats?.topStores[0]
              ? `${formatMoney(stats.topStores[0].total, currency)} spent`
              : undefined
          }
          loading={!stats}
        />
      </div>

      {/* Recent Receipts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Receipts</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard/receipts" />}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {!recentReceipts ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentReceipts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No receipts yet</p>
              <Button render={<Link href="/dashboard/receipts/new" />}>
                Add Your First Receipt
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReceipts.map((receipt) => (
                <Link
                  key={receipt._id}
                  href={`/dashboard/receipts/${receipt._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{receipt.storeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.date).toLocaleDateString()} &middot;{" "}
                        {receipt.itemCount} items
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatMoney(receipt.total, currency)}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Stores */}
      {stats && stats.topStores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Stores by Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topStores.map((store, index) => (
                <div key={store.name} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{store.name}</span>
                      <span className="text-sm font-semibold">
                        {formatMoney(store.total, currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(store.total / stats.topStores[0].total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mt-2" />
        ) : (
          <>
            <p className="text-xl md:text-2xl font-bold mt-2 truncate">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
