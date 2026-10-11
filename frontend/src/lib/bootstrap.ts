import { db } from '@/db/database';
import { purgeDemoData } from '@/lib/demoData';
import { applyPendingSignupAccount } from '@/lib/pendingAccount';
import { useAppStore } from '@/stores/appStore';

/**
 * First-run bootstrap: theme sync, the account collected at signup, and a
 * one-time cleanup of demo data left behind by older versions. Runs once the
 * user is known — with auth configured it must not touch anything while
 * sitting on the login page.
 */
export async function bootstrapApp(): Promise<void> {
  const settings = await db.settings.get('app');
  // IndexedDB is the source of truth for the theme; localStorage only
  // provides the instant first-paint value in initTheme().
  if (settings?.theme && settings.theme !== useAppStore.getState().theme) {
    useAppStore.getState().setTheme(settings.theme);
  }
  if (await applyPendingSignupAccount()) return;
  // Older versions seeded ~300 demo trades into first-run databases. The
  // seeder is gone; purge anything it left behind (no-op on real user data).
  await purgeDemoData().catch((err) => console.error('Demo data cleanup failed', err));
}
