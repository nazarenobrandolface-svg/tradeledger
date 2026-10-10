import { db } from '@/db/database';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/types/trade';

export interface PendingAccount {
  name: string;
  type: AccountType;
  currency: string;
  startingBalance: number;
  leverage: number;
}

const STORAGE_KEY = 'tradeledger.pendingAccount';

/**
 * Stores the account details collected on the signup form until the app can
 * persist them (the form itself has no database access, and email
 * confirmation may defer sign-in to a later session).
 */
export function savePendingAccount(account: PendingAccount): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function pendingAccountName(type: AccountType): string {
  return `${ACCOUNT_TYPE_LABELS[type]} Account`;
}

function readPendingAccount(): PendingAccount | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  localStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as Partial<PendingAccount>;
    if (
      typeof parsed.type !== 'string' ||
      typeof parsed.startingBalance !== 'number' ||
      typeof parsed.leverage !== 'number'
    ) {
      return null;
    }
    return {
      name:
        typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : pendingAccountName(parsed.type),
      type: parsed.type as AccountType,
      currency: typeof parsed.currency === 'string' ? parsed.currency : 'USD',
      startingBalance: parsed.startingBalance,
      leverage: parsed.leverage
    };
  } catch {
    return null;
  }
}

/**
 * Creates the signup account as the user's default trading account. Runs
 * before the demo seed so the user's own account replaces the default demo
 * account (and no fake demo trades are attached to it).
 *
 * Returns true when it handled first-run setup and the demo seed should be
 * skipped.
 */
export async function applyPendingSignupAccount(): Promise<boolean> {
  const pending = readPendingAccount();
  if (!pending) return false;
  // Never touch a database that already has trading data.
  if ((await db.accounts.count()) > 0) return false;

  const id = generateId();
  await db.accounts.put({
    id,
    name: pending.name,
    currency: pending.currency,
    startingBalance: pending.startingBalance,
    type: pending.type,
    leverage: pending.leverage,
    timezone: 'America/New_York',
    commissionPerTrade: 0,
    commissionPerShare: 0,
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  await repositories.settings.update({ seeded: true, defaultAccountId: id });
  return true;
}
