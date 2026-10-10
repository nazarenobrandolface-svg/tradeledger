import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { FloatingActionButton } from './FloatingActionButton';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { preloadPages } from '@/pageLoaders';

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

export function AppShell() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const location = useLocation();

  // Warm every route chunk shortly after boot so navigating between pages
  // never flashes a loader — the page swap animation always plays.
  useEffect(() => {
    const timer = window.setTimeout(preloadPages, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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
            <Suspense fallback={<PageLoader />}>
              <div
                key={location.pathname}
                className="animate-page-in motion-reduce:animate-none"
              >
                <Outlet />
              </div>
            </Suspense>
          </main>
        </div>
        <MobileNav />
        <FloatingActionButton />
      </div>
    </TooltipProvider>
  );
}
