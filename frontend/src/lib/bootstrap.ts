import { db } from '@/db/database';
import { seed } from '@/db/seed';
import { repositories } from '@/repositories';
import { applyPendingSignupAccount } from '@/lib/pendingAccount';
import { useAppStore } from '@/stores/appStore';

/**
 * First-run bootstrap: theme sync, the account collected at signup, and demo
 * data for an otherwise empty database. Runs once the user is known — with
 * auth configured it must not seed demo data while sitting on the login page,
 * otherwise the demo accounts would shadow the signup account.
 */
export async function bootstrapApp(): Promise<void> {
  const settings = await db.settings.get('app');
  // IndexedDB is the source of truth for the theme; localStorage only
  // provides the instant first-paint value in initTheme().
  if (settings?.theme && settings.theme !== useAppStore.getState().theme) {
    useAppStore.getState().setTheme(settings.theme);
  }
  // The signup account replaces the default (demo) account.
  if (await applyPendingSignupAccount()) return;
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
}
