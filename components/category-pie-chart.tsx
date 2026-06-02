"use client";

import { useState } from "react";

interface Slice {
  slug: string;
  name: string;
  total: number;
  percent: number;
}

// Distinct palette that holds up in both light and dark mode.
const PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
];

export function colorForIndex(index: number) {
  return PALETTE[index % PALETTE.length];
}

interface CategoryPieChartProps {
  slices: Slice[];
  size?: number;
}

const OFFSET_PX = 10;

export function CategoryPieChart({ slices, size = 220 }: CategoryPieChartProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  if (slices.length === 0 || slices.every((s) => s.total === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  // Pad the viewBox so percentage labels rendered just outside the pie aren't clipped.
  const labelPad = 32;
  const radius = size / 2;
  const cx = radius + labelPad;
  const cy = radius + labelPad;
  const viewSize = size + labelPad * 2;
  // Only label slices large enough that the text won't crowd a neighbor.
  const LABEL_THRESHOLD_PERCENT = 4;
  const labelRadius = radius + 14;

  // Build arc paths. We use degrees converted to radians, starting at -90deg
  // so the first slice begins at 12 o'clock.
  let cumulativePercent = 0;
  const arcs = slices.map((slice, i) => {
    const startPercent = cumulativePercent;
    const endPercent = cumulativePercent + slice.percent;
    cumulativePercent = endPercent;

    const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);

    const largeArc = slice.percent > 50 ? 1 : 0;

    // If a single slice covers 100% an arc path collapses to a point — use a
    // full circle path instead.
    const d =
      slice.percent >= 100 - 0.001
        ? `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const offsetX = Math.cos(midAngle) * OFFSET_PX;
    const offsetY = Math.sin(midAngle) * OFFSET_PX;

    return { d, color: colorForIndex(i), slice, labelX, labelY, offsetX, offsetY };
  });

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      width={viewSize}
      height={viewSize}
      role="img"
      aria-label="Category spending breakdown"
    >
      {arcs.map((arc) => {
        const isSelected = arc.slice.slug === selectedSlug;
        const translate = isSelected
          ? `translate(${arc.offsetX} ${arc.offsetY})`
          : "translate(0 0)";
        return (
          <g
            key={arc.slice.slug}
            transform={translate}
            onClick={() =>
              setSelectedSlug(isSelected ? null : arc.slice.slug)
            }
            style={{
              transition: "transform 200ms ease-out",
              cursor: "pointer",
            }}
          >
            <path
              d={arc.d}
              fill={arc.color}
              stroke="var(--background)"
              strokeWidth={2}
            >
              <title>{`${arc.slice.name}: ${arc.slice.percent.toFixed(1)}%`}</title>
            </path>
            {arc.slice.percent >= LABEL_THRESHOLD_PERCENT && (
              <text
                x={arc.labelX}
                y={arc.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-[11px] font-medium tabular-nums pointer-events-none"
              >
                {arc.slice.percent.toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
