"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  namesLikelySameProduct,
  normalizeProductName,
} from "@/lib/product-matching";
import { History } from "lucide-react";

const MAX_SUGGESTIONS = 6;

interface ProductNameInputProps {
  value: string;
  onChange: (value: string) => void;
  existingNames: string[];
  placeholder?: string;
}

// Product name field that suggests the user's existing products while typing,
// so repeat purchases land on the same product record (and therefore in the
// same price history) instead of creating a near-duplicate under a slightly
// different spelling.
export function ProductNameInput({
  value,
  onChange,
  existingNames,
  placeholder,
}: ProductNameInputProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = useMemo(() => {
    const query = normalizeProductName(value);
    if (!query) return [];
    const scored: { name: string; score: number }[] = [];
    for (const name of existingNames) {
      const normalized = normalizeProductName(name);
      if (normalized === query) continue; // already an exact match
      let score = 0;
      if (normalized.startsWith(query)) score = 3;
      else if (normalized.includes(query)) score = 2;
      else if (namesLikelySameProduct(name, value)) score = 1;
      if (score > 0) scored.push({ name, score });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS)
      .map((s) => s.name);
  }, [value, existingNames]);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlighted(-1);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setHighlighted(-1);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted(
              (h) => (h - 1 + suggestions.length) % suggestions.length
            );
          } else if (e.key === "Enter" && highlighted >= 0) {
            e.preventDefault();
            select(suggestions[highlighted]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
      />
      {showList && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === highlighted}
              // onMouseDown so the click wins over the input's onBlur.
              onMouseDown={(e) => {
                e.preventDefault();
                select(name);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                i === highlighted ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
