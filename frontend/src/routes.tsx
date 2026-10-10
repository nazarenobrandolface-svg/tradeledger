import { lazy } from 'react';
import { pageLoaders } from '@/pageLoaders';

export const DashboardPage = lazy(() =>
  pageLoaders.dashboard().then((m) => ({ default: m.DashboardPage }))
);
export const JournalPage = lazy(() =>
  pageLoaders.journal().then((m) => ({ default: m.JournalPage }))
);
export const TradesPage = lazy(() =>
  pageLoaders.trades().then((m) => ({ default: m.TradesPage }))
);
export const TradeDetailPage = lazy(() =>
  pageLoaders.tradeDetail().then((m) => ({ default: m.TradeDetailPage }))
);
export const TradeFormPage = lazy(() =>
  pageLoaders.tradeForm().then((m) => ({ default: m.TradeFormPage }))
);
export const ImportPage = lazy(() =>
  pageLoaders.importTrades().then((m) => ({ default: m.ImportPage }))
);
export const ReportsPage = lazy(() =>
  pageLoaders.reports().then((m) => ({ default: m.ReportsPage }))
);
export const NotebookPage = lazy(() =>
  pageLoaders.notebook().then((m) => ({ default: m.NotebookPage }))
);
export const SessionsPage = lazy(() =>
  pageLoaders.sessions().then((m) => ({ default: m.SessionsPage }))
);
export const NewsPage = lazy(() =>
  pageLoaders.news().then((m) => ({ default: m.NewsPage }))
);
export const SettingsPage = lazy(() =>
  pageLoaders.settings().then((m) => ({ default: m.SettingsPage }))
);
