import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  sidebarCollapsed: false,
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      localStorage.setItem('sidebar-collapsed', String(next));
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }
}));

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export function initTheme() {
  const stored = localStorage.getItem('theme') as Theme | null;
  const theme = stored || 'system';
  useAppStore.getState().setTheme(theme);
  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  useAppStore.getState().setSidebarCollapsed(collapsed);
}
