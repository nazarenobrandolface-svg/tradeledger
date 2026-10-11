import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { UpdateToast } from '@/components/pwa/UpdateToast';
import { initTheme } from '@/stores/appStore';
import { initAuth, useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { bootstrapApp } from '@/lib/bootstrap';
import { LoginPage } from '@/features/auth/components/LoginPage';
import {
  DashboardPage,
  JournalPage,
  TradesPage,
  TradeDetailPage,
  TradeFormPage,
  ImportPage,
  ReportsPage,
  NotebookPage,
  SessionsPage,
  NewsPage,
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

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initTheme();
    initAuth();
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void bootstrapApp();
    };
    if (!isSupabaseConfigured) {
      start();
      return;
    }
    // Wait for auth resolution — and for a session — before bootstrapping,
    // so first-run setup never runs while the user is still looking at the
    // login page.
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.initialized && state.session) start();
    });
    const state = useAuthStore.getState();
    if (state.initialized && state.session) start();
    return unsubscribe;
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
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <InstallPrompt />
      <UpdateToast />
    </BrowserRouter>
  );
}
