"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// The mobile layout scrolls an inner region rather than the document body, so
// the browser toolbar (and the fixed bottom nav) don't shift while scrolling.
// Next's default scroll-to-top targets the window, so we reset this container
// ourselves whenever the route changes.
export function AppScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
}
