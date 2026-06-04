"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingActionButton() {
  const pathname = usePathname();

  // Only show the "Add Receipt" FAB on the home page.
  if (pathname !== "/dashboard") {
    return null;
  }

  return (
    <Link
      href="/dashboard/receipts/new"
      aria-label="Add receipt"
      className={cn(
        "fixed right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg hover:shadow-xl",
        "transition-transform active:scale-95",
        // Sit above the mobile bottom nav; desktop has no bottom nav.
        "bottom-[calc(5rem+env(safe-area-inset-bottom)+0.5rem)] md:bottom-6 md:right-6"
      )}
    >
      <Plus className="h-5 w-5" />
    </Link>
  );
}
