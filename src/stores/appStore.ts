import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const THEME_KEY = 'theme';

function syncThemeColorMeta() {
  const dark = document.documentElement.classList.contains('dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0D0F1A' : '#F6F7FB');
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  sidebarCollapsed: false,
  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); applying the theme still works.
    }
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
  syncThemeColorMeta();
}

let systemListenerAttached = false;

export function initTheme() {
  let stored: Theme | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY) as Theme | null;
  } catch {
    stored = null;
  }
  const theme = stored || 'system';
  useAppStore.getState().setTheme(theme);

  // Follow OS changes while the 'system' theme is selected.
  if (!systemListenerAttached) {
    systemListenerAttached = true;
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (useAppStore.getState().theme === 'system') applyTheme('system');
      });
  }

  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  useAppStore.getState().setSidebarCollapsed(collapsed);
}
