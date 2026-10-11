import { db } from '@/db/database';
import { repositories } from '@/repositories';

/** Exact account names the old demo seeder always created. */
const DEMO_ACCOUNT_NAMES = ['Main Trading Account', 'Swing Account'];

/**
 * Removes data produced by the old demo seeder (the app no longer seeds demo
 * data). Demo accounts are identified by the exact name + type the seeder
 * always used; user-created accounts, imported backups and anything else are
 * never touched. Shared tables (tags, notes, folders) are only wiped when the
 * database contained nothing but demo data.
 */
export async function purgeDemoData(): Promise<void> {
  const accounts = await db.accounts.toArray();
  const demoAccounts = accounts.filter(
    (a) => a.type === 'demo' && DEMO_ACCOUNT_NAMES.includes(a.name)
  );
  if (demoAccounts.length === 0) return;

  const demoAccountIds = demoAccounts.map((a) => a.id);
  const trades = await db.trades.toArray();
  const demoTrades = trades.filter((t) => demoAccountIds.includes(t.accountId));
  const demoTradeIds = demoTrades.map((t) => t.id);
  const onlyDemoData =
    accounts.length === demoAccounts.length && trades.length === demoTrades.length;

  await db.executions.where('tradeId').anyOf(demoTradeIds).delete();
  await db.tradeTags.where('tradeId').anyOf(demoTradeIds).delete();
  await db.attachments.where('tradeId').anyOf(demoTradeIds).delete();
  await db.trades.bulkDelete(demoTradeIds);
  await db.dayNotes.where('accountId').anyOf(demoAccountIds).delete();
  await db.accounts.bulkDelete(demoAccountIds);

  if (onlyDemoData) {
    await db.tags.clear();
    await db.notes.clear();
    await db.noteFolders.clear();
    await db.attachments.clear();
  }

  // If the deleted demo account was the default, promote a survivor.
  const remaining = await db.accounts.toArray();
  const firstRemaining = remaining[0];
  if (firstRemaining && !remaining.some((a) => a.isDefault)) {
    await db.accounts.update(firstRemaining.id, { isDefault: true });
  }

  const settings = await db.settings.get('app');
  if (settings?.defaultAccountId && demoAccountIds.includes(settings.defaultAccountId)) {
    await repositories.settings.update({ defaultAccountId: firstRemaining?.id ?? null });
  }
}
