"use client";

import { formatMoney } from "@/lib/currencies";

interface TrendPoint {
  year: number;
  month: number;
  total: number;
}

const MONTH_SHORT = [
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

interface MonthlyTrendChartProps {
  data: TrendPoint[];
  currency: string;
  // Index of the month that's currently selected on the page, to highlight it.
  selectedIndex?: number;
}

export function MonthlyTrendChart({
  data,
  currency,
  selectedIndex,
}: MonthlyTrendChartProps) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-40 px-1">
      {data.map((point, i) => {
        const heightPct = (point.total / max) * 100;
        const isSelected = i === selectedIndex;
        return (
          <div
            key={`${point.year}-${point.month}`}
            className="flex flex-1 flex-col items-center gap-1 min-w-0"
          >
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {point.total > 0 ? formatMoney(point.total, currency) : ""}
            </span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-10 rounded-t transition-colors ${
                  isSelected ? "bg-primary" : "bg-primary/30"
                }`}
                style={{ height: `${Math.max(heightPct, point.total > 0 ? 4 : 0)}%` }}
                title={`${MONTH_SHORT[point.month]} ${point.year}: ${formatMoney(point.total, currency)}`}
              />
            </div>
            <span
              className={`text-[11px] tabular-nums ${
                isSelected ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {MONTH_SHORT[point.month]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
