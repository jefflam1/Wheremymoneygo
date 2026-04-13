"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Receipt, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  return { start, end };
}

function formatMonth(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayInfo(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return {
    day: date.getDate(),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

interface ReceiptItem {
  _id: string;
  productName: string;
  price: number;
  quantity: number;
  category?: string;
}

interface ReceiptWithItems {
  _id: string;
  storeName: string;
  total: number;
  date: number;
  paymentMethod?: string;
  items: ReceiptItem[];
}

interface DayGroup {
  dateKey: string;
  dayTotal: number;
  receipts: ReceiptWithItems[];
}

function CollapsibleReceipt({
  receipt,
  currency,
  categoryLabels,
}: {
  receipt: ReceiptWithItems;
  currency: string;
  categoryLabels: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* Store header row — tappable to expand */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center px-4 py-2 border-b hover:bg-muted/30 transition-colors active:bg-muted/50 cursor-pointer"
      >
        <div className="w-5 shrink-0 flex items-center justify-center">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="w-14 shrink-0">
          <p className="text-[10px] leading-tight text-muted-foreground/60 truncate">
            {receipt.paymentMethod ?? ""}
          </p>
        </div>
        <div className="flex-1 min-w-0 px-2">
          <p className="text-sm font-medium truncate">{receipt.storeName}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums shrink-0 text-red-500">
          {formatMoney(receipt.total, currency)}
        </span>
      </div>

      {/* Expanded items */}
      {expanded &&
        receipt.items.map((item) => (
          <Link
            key={item._id}
            href={`/dashboard/receipts/${receipt._id}`}
            className="flex items-center pl-9 pr-4 py-1 border-b hover:bg-muted/30 transition-colors active:bg-muted/50"
          >
            <div className="w-14 shrink-0">
              <p className="text-[11px] leading-tight text-muted-foreground truncate">
                {item.category
                  ? categoryLabels.get(item.category) || item.category
                  : ""}
              </p>
            </div>
            <div className="flex-1 min-w-0 px-2">
              <p className="text-[13px] text-muted-foreground truncate">
                {item.productName}
              </p>
            </div>
            <span className="text-[13px] text-muted-foreground tabular-nums shrink-0">
              {item.quantity > 1 && `${item.quantity}x `}
              {formatMoney(item.price * item.quantity, currency)}
            </span>
          </Link>
        ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useCurrentUser();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { start: startDate, end: endDate } = useMemo(
    () => getMonthRange(year, month),
    [year, month]
  );

  const receiptsWithItems = useQuery(
    api.receipts.getReceiptsWithItems,
    user?._id
      ? { userId: user._id, startDate, endDate }
      : "skip"
  );

  const categories = useQuery(
    api.categories.getCategories,
    user?._id ? { userId: user._id } : "skip"
  );

  const categoryLabels = useMemo(() => {
    const map = new Map<string, string>();
    if (!categories) return map;
    for (const cat of categories) {
      map.set(cat.slug, cat.name);
      for (const sub of cat.children) {
        map.set(sub.slug, sub.name);
      }
    }
    return map;
  }, [categories]);

  const { dayGroups, monthTotal, receiptCount } = useMemo(() => {
    if (!receiptsWithItems) return { dayGroups: [] as DayGroup[], monthTotal: 0, receiptCount: 0 };
    const groups = new Map<string, DayGroup>();
    let total = 0;

    for (const receipt of receiptsWithItems) {
      const dateKey = toDateKey(receipt.date);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { dateKey, dayTotal: 0, receipts: [] });
      }
      const group = groups.get(dateKey)!;
      group.dayTotal += receipt.total;
      group.receipts.push(receipt);
      total += receipt.total;
    }

    return {
      dayGroups: Array.from(groups.values()),
      monthTotal: total,
      receiptCount: receiptsWithItems.length,
    };
  }, [receiptsWithItems]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p>Loading user data...</p>
      </div>
    );
  }

  const currency = user.currency ?? DEFAULT_CURRENCY;
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  return (
    <div>
      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button onClick={goToPrevMonth} className="p-1 hover:bg-muted rounded transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">{formatMonth(year, month)}</span>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary bar */}
      {receiptsWithItems ? (
        <div className="grid grid-cols-2 text-center border-b py-2 px-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Expenses</p>
            <p className="text-sm font-semibold text-red-500">
              {formatMoney(monthTotal, currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Receipts</p>
            <p className="text-sm font-semibold">{receiptCount}</p>
          </div>
        </div>
      ) : (
        <div className="border-b py-3 px-4">
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {/* Daily transaction list */}
      {!receiptsWithItems ? (
        <div className="px-4 py-2 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm mb-3">
            No expenses in {formatMonth(year, month)}
          </p>
          <Button size="sm" render={<Link href="/dashboard/receipts/new" />}>
            Add Receipt
          </Button>
        </div>
      ) : (
        <div>
          {dayGroups.map((group) => {
            const { day, weekday } = getDayInfo(group.dateKey);
            return (
              <div key={group.dateKey}>
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{day}</span>
                    <span className="text-[10px] bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                      {weekday}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-500">
                    {formatMoney(group.dayTotal, currency)}
                  </span>
                </div>

                {/* Transactions */}
                {group.receipts.map((receipt) =>
                  receipt.items.length > 1 ? (
                    <CollapsibleReceipt
                      key={receipt._id}
                      receipt={receipt}
                      currency={currency}
                      categoryLabels={categoryLabels}
                    />
                  ) : (
                    // Single-item receipt: flat row
                    <Link
                      key={receipt._id}
                      href={`/dashboard/receipts/${receipt._id}`}
                      className="flex items-center px-4 py-2 border-b hover:bg-muted/30 transition-colors active:bg-muted/50"
                    >
                      <div className="w-5 shrink-0" />
                      <div className="w-14 shrink-0">
                        <p className="text-[11px] leading-tight text-muted-foreground truncate">
                          {receipt.items[0]?.category
                            ? categoryLabels.get(receipt.items[0].category) || receipt.items[0].category
                            : ""}
                        </p>
                        <p className="text-[10px] leading-tight text-muted-foreground/60 truncate">
                          {receipt.paymentMethod ?? ""}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0 px-2">
                        <p className="text-sm truncate">{receipt.storeName}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums shrink-0 text-red-500">
                        {formatMoney(receipt.total, currency)}
                      </span>
                    </Link>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5" />
      </div>
      <div className="border-b py-3 px-4">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="px-4 py-2 space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
