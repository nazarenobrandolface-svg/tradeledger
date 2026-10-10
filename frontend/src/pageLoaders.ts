export const pageLoaders = {
  dashboard: () => import('@/features/dashboard/components/DashboardPage'),
  journal: () => import('@/features/journal/components/JournalPage'),
  trades: () => import('@/features/trades/components/TradesPage'),
  tradeDetail: () => import('@/features/trades/components/TradeDetailPage'),
  tradeForm: () => import('@/features/trades/components/TradeFormPage'),
  importTrades: () => import('@/features/import/components/ImportPage'),
  reports: () => import('@/features/reports/components/ReportsPage'),
  notebook: () => import('@/features/notebook/components/NotebookPage'),
  sessions: () => import('@/features/sessions/components/SessionsPage'),
  news: () => import('@/features/news/components/NewsPage'),
  settings: () => import('@/features/settings/components/SettingsPage')
};

export function preloadPages(): void {
  Object.values(pageLoaders).forEach((load) => {
    void load().catch(() => undefined);
  });
}
