"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon } from "lucide-react";
import { formatMoney, DEFAULT_CURRENCY } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  CategoryPieChart,
  colorForIndex,
} from "@/components/category-pie-chart";

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

  const breakdown = useQuery(
    api.stats.getCategoryBreakdown,
    user?._id ? { userId: user._id, startDate, endDate } : "skip"
  );

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

          {/* Legend / breakdown list */}
          <ul>
            {slices.map((slice, index) => (
              <li
                key={slice.slug}
                className="flex items-center gap-3 px-4 py-3"
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
              </li>
            ))}
          </ul>
        </>
      )}
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
