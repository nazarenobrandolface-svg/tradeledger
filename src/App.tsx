import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { initTheme } from '@/stores/appStore';
import { db } from '@/db/database';
import { seed } from '@/db/seed';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardPage = lazy(() =>
  import('@/features/dashboard/components/DashboardPage').then((m) => ({
    default: m.DashboardPage
  }))
);
const JournalPage = lazy(() =>
  import('@/features/journal/components/JournalPage').then((m) => ({
    default: m.JournalPage
  }))
);
const TradesPage = lazy(() =>
  import('@/features/trades/components/TradesPage').then((m) => ({
    default: m.TradesPage
  }))
);
const TradeDetailPage = lazy(() =>
  import('@/features/trades/components/TradeDetailPage').then((m) => ({
    default: m.TradeDetailPage
  }))
);
const TradeFormPage = lazy(() =>
  import('@/features/trades/components/TradeFormPage').then((m) => ({
    default: m.TradeFormPage
  }))
);
const ImportPage = lazy(() =>
  import('@/features/import/components/ImportPage').then((m) => ({
    default: m.ImportPage
  }))
);
const ReportsPage = lazy(() =>
  import('@/features/reports/components/ReportsPage').then((m) => ({
    default: m.ReportsPage
  }))
);
const PlaybooksPage = lazy(() =>
  import('@/features/playbooks/components/PlaybooksPage').then((m) => ({
    default: m.PlaybooksPage
  }))
);
const PlaybookDetailPage = lazy(() =>
  import('@/features/playbooks/components/PlaybookDetailPage').then((m) => ({
    default: m.PlaybookDetailPage
  }))
);
const NotebookPage = lazy(() =>
  import('@/features/notebook/components/NotebookPage').then((m) => ({
    default: m.NotebookPage
  }))
);
const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then((m) => ({
    default: m.SettingsPage
  }))
);

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
      <a href="/dashboard" className="mt-4 text-primary hover:underline">
        Go to Dashboard
      </a>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initTheme();
    const checkSeed = async () => {
      const settings = await db.settings.get('app');
      if (!settings?.seeded) {
        await seed();
      }
    };
    checkSeed();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:date" element={<JournalPage />} />
            <Route path="/trades" element={<TradesPage />} />
            <Route path="/trades/new" element={<TradeFormPage />} />
            <Route path="/trades/:id" element={<TradeDetailPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:tab" element={<ReportsPage />} />
            <Route path="/playbooks" element={<PlaybooksPage />} />
            <Route path="/playbooks/:id" element={<PlaybookDetailPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <InstallPrompt />
      <UpdateToast />
    </BrowserRouter>
  );
}
