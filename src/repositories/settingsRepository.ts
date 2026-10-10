import { db } from '@/db/database';
import type { SettingsRepository } from './types';
import type { AppSettings } from '@/types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  key: 'app',
  theme: 'system',
  sidebarCollapsed: false,
  defaultAccountId: null,
  lastDateRange: null,
  seeded: false
};

export const settingsRepository: SettingsRepository = {
  async get() {
    const settings = await db.settings.get('app');
    return settings ?? DEFAULT_SETTINGS;
  },

  async update(changes) {
    const current = await this.get();
    await db.settings.put({ ...current, ...changes, key: 'app' });
  }
};
