"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  CategoryPieChart,
  colorForIndex,
} from "@/components/category-pie-chart";
import { MonthlyTrendChart } from "@/components/monthly-trend-chart";

const TREND_MONTHS = 6;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

export default function StatsPage() {
  const { user, isLoading: userLoading } = useCurrentUser();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  const { start: startDate, end: endDate } = useMemo(
    () => getMonthRange(year, month),
    [year, month]
  );

  // Trailing TREND_MONTHS window ending with the selected month.
  const { trendStart, trendEnd } = useMemo(() => {
    const start = new Date(year, month - (TREND_MONTHS - 1), 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    return { trendStart: start, trendEnd: end };
  }, [year, month]);

  const breakdown = useQuery(
    api.stats.getCategoryBreakdown,
    user?._id ? { userId: user._id, startDate, endDate } : "skip"
  );

  const trend = useQuery(
    api.stats.getMonthlyTrend,
    user?._id
      ? { userId: user._id, startDate: trendStart, endDate: trendEnd }
      : "skip"
  );

  const budgets = useQuery(
    api.budgets.getBudgets,
    user?._id ? { userId: user._id } : "skip"
  );

  const [selectedCategory, setSelectedCategory] = useState<{
    slug: string;
    name: string;
    total: number;
    percent: number;
  } | null>(null);

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

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  const togglePicker = () => {
    if (!showPicker) setPickerYear(year);
    setShowPicker(!showPicker);
  };

  const selectMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setShowPicker(false);
  };

  if (userLoading) {
    return <StatsSkeleton />;
  }

  if (!user) {
    return (
      <div className="p-4">
        <p>Please sign in to view stats.</p>
      </div>
    );
  }

  const currency = user.currency ?? DEFAULT_CURRENCY;
  const slices = breakdown?.categories ?? [];
  const hasData = slices.length > 0 && breakdown!.grandTotal > 0;

  return (
    <div>
      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={goToPrevMonth}
          className="p-1 hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={togglePicker}
          className="text-sm font-semibold hover:bg-muted px-2 py-1 transition-colors"
          aria-expanded={showPicker}
        >
          {formatMonth(year, month)}
        </button>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="p-1 hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {showPicker ? (
        <MonthYearPicker
          pickerYear={pickerYear}
          selectedYear={year}
          selectedMonth={month}
          currentYear={now.getFullYear()}
          currentMonth={now.getMonth()}
          onPickerYearChange={setPickerYear}
          onSelect={selectMonth}
        />
      ) : !breakdown ? (
        <StatsContentSkeleton />
      ) : !hasData ? (
        <div className="px-4 py-16 text-center">
          <PieChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No spending recorded in {formatMonth(year, month)}
          </p>
        </div>
      ) : (
        <>
          {/* Pie chart + total */}
          <div className="flex flex-col items-center gap-4 px-4 py-6">
            <CategoryPieChart slices={slices} />
            <div className="text-center">
              <p className="text-xs uppercase text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                {formatMoney(breakdown.grandTotal, currency)}
              </p>
            </div>
          </div>

          {/* Budget progress */}
          <BudgetProgress
            budgets={budgets ?? []}
            grandTotal={breakdown.grandTotal}
            categoryTotals={slices}
            currency={currency}
          />

          {/* Spending trend */}
          {trend && trend.length > 0 && (
            <div className="px-4 py-6 border-t border-border/60">
              <p className="text-xs uppercase text-muted-foreground mb-4">
                Last {TREND_MONTHS} months
              </p>
              <MonthlyTrendChart
                data={trend}
                currency={currency}
                selectedIndex={trend.length - 1}
              />
            </div>
          )}

          {/* Legend / breakdown list — tap a category to drill into sub-categories */}
          <ul className="border-t border-border/60">
            {slices.map((slice, index) => (
              <li key={slice.slug} className="border-b border-border/60">
                <button
                  onClick={() =>
                    setSelectedCategory({
                      slug: slice.slug,
                      name: slice.name,
                      total: slice.total,
                      percent: slice.percent,
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span
                    className="h-3 w-3 shrink-0"
                    style={{ backgroundColor: colorForIndex(index) }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{slice.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {slice.itemCount} item
                      {slice.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">
                      {formatMoney(slice.total, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {slice.percent.toFixed(1)}%
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>

          {/* Category drill-down: slides up from the bottom on tap */}
          <Sheet
            open={selectedCategory !== null}
            onOpenChange={(open) => !open && setSelectedCategory(null)}
          >
            <SheetContent
              side="bottom"
              className="max-h-[85vh] rounded-t-2xl p-0"
            >
              {selectedCategory && (
                <>
                  <SheetHeader className="border-b px-4 py-4">
                    <SheetTitle className="flex items-center justify-between gap-3 pr-8">
                      <span className="truncate">{selectedCategory.name}</span>
                      <span className="tabular-nums shrink-0">
                        {formatMoney(selectedCategory.total, currency)}
                      </span>
                    </SheetTitle>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {selectedCategory.percent.toFixed(1)}% of this month&apos;s
                      spending
                    </p>
                  </SheetHeader>
                  <div className="overflow-y-auto px-4 pb-6 pt-2">
                    {user && (
                      <CategoryDetail
                        userId={user._id}
                        parentSlug={selectedCategory.slug}
                        startDate={startDate}
                        endDate={endDate}
                        currency={currency}
                      />
                    )}
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

interface CategoryDetailProps {
  userId: Id<"users">;
  parentSlug: string;
  startDate: number;
  endDate: number;
  currency: string;
}

function CategoryDetail({
  userId,
  parentSlug,
  startDate,
  endDate,
  currency,
}: CategoryDetailProps) {
  const detail = useQuery(api.stats.getCategoryDetail, {
    userId,
    startDate,
    endDate,
    parentSlug,
  });

  if (!detail) {
    return <Skeleton className="h-24 w-full" />;
  }

  // Assign each sub-category a stable colour (same order as the list above) so
  // the swatch on a sub-category matches the dot on its individual expenses.
  const subColors = new Map<string, string>();
  detail.subcategories.forEach((sub, index) => {
    subColors.set(sub.slug, colorForIndex(index));
  });
  const showSubColors = detail.subcategories.length > 1;

  return (
    <div>
      {/* Sub-category totals (only when there's more than one) */}
      {detail.subcategories.length > 1 && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-muted/50 p-3">
          <p className="text-xs uppercase text-muted-foreground mb-1">
            Sub-categories
          </p>
          {detail.subcategories.map((sub, index) => (
            <div
              key={sub.slug}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: colorForIndex(index) }}
                aria-hidden
              />
              <span className="text-muted-foreground truncate flex-1">
                {sub.name}
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {formatMoney(sub.total, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Individual expenses */}
      <ul className="divide-y divide-border/60">
        {detail.items.map((item, i) => (
          <li
            key={`${item.receiptId}-${i}`}
            className="flex items-center gap-3 py-2"
          >
            <Link
              href={`/dashboard/receipts/${item.receiptId}`}
              className="min-w-0 flex-1 hover:underline"
            >
              <p className="text-sm truncate">
                {item.quantity > 1 ? `${item.quantity}× ` : ""}
                {item.productName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {showSubColors && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white shrink-0"
                    style={{ backgroundColor: subColors.get(item.subSlug) }}
                  >
                    {item.subName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {item.storeName} · {new Date(item.date).toLocaleDateString()}
                </span>
              </div>
            </Link>
            <span className="text-sm font-medium tabular-nums shrink-0">
              {formatMoney(item.total, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BudgetProgressProps {
  budgets: { _id: Id<"budgets">; categorySlug?: string; amount: number }[];
  grandTotal: number;
  categoryTotals: { slug: string; name: string; total: number }[];
  currency: string;
}

function BudgetProgress({
  budgets,
  grandTotal,
  categoryTotals,
  currency,
}: BudgetProgressProps) {
  if (budgets.length === 0) return null;

  const overall = budgets.find((b) => b.categorySlug === undefined);
  const categoryBudgets = budgets.filter((b) => b.categorySlug !== undefined);

  const rows: { key: string; label: string; spent: number; budget: number }[] =
    [];

  if (overall) {
    rows.push({
      key: "overall",
      label: "Overall",
      spent: grandTotal,
      budget: overall.amount,
    });
  }
  for (const b of categoryBudgets) {
    const cat = categoryTotals.find((c) => c.slug === b.categorySlug);
    rows.push({
      key: b.categorySlug!,
      label: cat?.name ?? b.categorySlug!,
      spent: cat?.total ?? 0,
      budget: b.amount,
    });
  }

  return (
    <div className="px-4 py-6 border-t border-border/60">
      <p className="text-xs uppercase text-muted-foreground mb-4">Budgets</p>
      <div className="space-y-4">
        {rows.map((row) => {
          const pct = row.budget > 0 ? (row.spent / row.budget) * 100 : 0;
          const over = row.spent > row.budget;
          const near = !over && pct >= 90;
          const barColor = over
            ? "bg-red-500"
            : near
              ? "bg-amber-500"
              : "bg-primary";
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{row.label}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    over
                      ? "text-red-600 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {formatMoney(row.spent, currency)} /{" "}
                  {formatMoney(row.budget, currency)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              {over && (
                <p className="text-xs text-red-600 mt-1">
                  Over by {formatMoney(row.spent - row.budget, currency)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div>
      <div className="px-4 py-2">
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>
      <StatsContentSkeleton />
    </div>
  );
}

function StatsContentSkeleton() {
  return (
    <>
      <div className="px-4 py-6">
        <Skeleton className="h-56 w-56 mx-auto rounded-full" />
      </div>
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

interface MonthYearPickerProps {
  pickerYear: number;
  selectedYear: number;
  selectedMonth: number;
  currentYear: number;
  currentMonth: number;
  onPickerYearChange: (year: number) => void;
  onSelect: (year: number, month: number) => void;
}

function MonthYearPicker({
  pickerYear,
  selectedYear,
  selectedMonth,
  currentYear,
  currentMonth,
  onPickerYearChange,
  onSelect,
}: MonthYearPickerProps) {
  const canGoForward = pickerYear < currentYear;

  return (
    <div className="px-4 py-4">
      {/* Year nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onPickerYearChange(pickerYear - 1)}
          className="p-1 hover:bg-muted transition-colors"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold tabular-nums">
          {pickerYear}
        </span>
        <button
          onClick={() => onPickerYearChange(pickerYear + 1)}
          disabled={!canGoForward}
          className="p-1 hover:bg-muted transition-colors disabled:opacity-30"
          aria-label="Next year"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS.map((label, m) => {
          const isFuture =
            pickerYear > currentYear ||
            (pickerYear === currentYear && m > currentMonth);
          const isSelected =
            pickerYear === selectedYear && m === selectedMonth;
          return (
            <button
              key={label}
              disabled={isFuture}
              onClick={() => onSelect(pickerYear, m)}
              className={cn(
                "px-3 py-3 text-sm font-medium transition-colors",
                isFuture && "opacity-30 cursor-not-allowed",
                !isFuture && !isSelected && "hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
