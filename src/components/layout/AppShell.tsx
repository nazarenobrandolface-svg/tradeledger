import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { FloatingActionButton } from './FloatingActionButton';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppShell() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const location = useLocation();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className={cn(
            'transition-all duration-150',
            sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[240px]'
          )}
        >
          <TopBar />
          <main className="p-4 pb-20 md:p-6 md:pb-6">
            <div key={location.pathname} className="animate-page-in motion-reduce:animate-none">
              <Outlet />
            </div>
          </main>
        </div>
        <MobileNav />
        <FloatingActionButton />
      </div>
    </TooltipProvider>
  );
}
