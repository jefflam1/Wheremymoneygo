import { MobileNav } from "@/components/mobile-nav";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { FloatingActionButton } from "@/components/floating-action-button";
import { AppScroll } from "@/components/app-scroll";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:min-h-screen">
      <DesktopSidebar />
      {/* Mobile: a fixed-height app shell whose inner region scrolls, so the
          browser chrome and bottom nav stay put. Desktop reverts to normal
          document scrolling with the fixed sidebar. */}
      <div className="flex h-dvh flex-col md:block md:h-auto">
        <AppScroll className="flex-1 overflow-y-auto overscroll-contain md:flex-none md:overflow-visible md:pl-64">
          <div className="mx-auto max-w-7xl">{children}</div>
        </AppScroll>
        <MobileNav />
      </div>
      <FloatingActionButton />
    </div>
  );
}
