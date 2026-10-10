export interface ImportTemplate {
  id: string;
  name: string;
  broker: string;
  columnMapping: Record<string, string>;
  hasHeader: boolean;
  delimiter: string;
  createdAt: number;
}

export interface AppSettings {
  key: string;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  defaultAccountId: string | null;
  lastDateRange: { from: number; to: number } | null;
  seeded: boolean;
}
