import { MobileNav } from "@/components/mobile-nav";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { FloatingActionButton } from "@/components/floating-action-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <DesktopSidebar />
      <main className="md:pl-64 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <MobileNav />
      <FloatingActionButton />
    </div>
  );
}
``;
