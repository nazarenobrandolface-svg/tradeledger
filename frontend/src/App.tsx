import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { initTheme, useAppStore } from '@/stores/appStore';
import { initAuth, useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { db } from '@/db/database';
import { seed } from '@/db/seed';
import { repositories } from '@/repositories';
import {
  DashboardPage,
  JournalPage,
  TradesPage,
  TradeDetailPage,
  TradeFormPage,
  ImportPage,
  ReportsPage,
  NotebookPage,
  SettingsPage
} from '@/routes';

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

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initTheme();
    initAuth();
    const checkSeed = async () => {
      const settings = await db.settings.get('app');
      // IndexedDB is the source of truth for the theme; localStorage only
      // provides the instant first-paint value in initTheme().
      if (settings?.theme && settings.theme !== useAppStore.getState().theme) {
        useAppStore.getState().setTheme(settings.theme);
      }
      if (settings?.seeded) return;
      // Only seed a truly empty database. Never clear existing user data.
      const [accountCount, tradeCount, noteCount] = await Promise.all([
        db.accounts.count(),
        db.trades.count(),
        db.notes.count()
      ]);
      if (accountCount > 0 || tradeCount > 0 || noteCount > 0) {
        await repositories.settings.update({ seeded: true });
        return;
      }
      await seed();
    };
    checkSeed();
  }, []);

  const shell = <AppShell />;
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isSupabaseConfigured ? <LoginPage /> : <Navigate to="/dashboard" replace />
          }
        />
        <Route element={isSupabaseConfigured ? <RequireAuth>{shell}</RequireAuth> : shell}>
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
          <Route path="/notebook" element={<NotebookPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <InstallPrompt />
      <UpdateToast />
    </BrowserRouter>
  );
}
