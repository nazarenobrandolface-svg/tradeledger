import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { purgeDemoData } from '@/lib/demoData';
import type { Account, Execution, Trade } from '@/types/trade';
import type { Note } from '@/types/note';

function demoAccount(id: string, isDefault = false): Account {
  return {
    id,
    name: 'Main Trading Account',
    currency: 'USD',
    startingBalance: 50000,
    type: 'demo',
    leverage: 100,
    timezone: 'America/New_York',
    commissionPerTrade: 0,
    commissionPerShare: 0.005,
    isDefault,
    createdAt: 1,
    updatedAt: 1
  };
}

function userAccount(id: string, isDefault = false): Account {
  return { ...demoAccount(id, isDefault), name: 'My Real Account', type: 'live' };
}

function trade(id: string, accountId: string): Trade {
  return {
    id,
    accountId,
    symbol: 'AAPL',
    category: 'stocks',
    side: 'long',
    status: 'closed',
    openedAt: 1000,
    closedAt: 2000,
    plannedEntry: null,
    plannedStop: null,
    plannedTarget: null,
    rating: null,
    notes: '',
    createdAt: 1000,
    updatedAt: 2000
  };
}

function execution(id: string, tradeId: string): Execution {
  return {
    id,
    tradeId,
    type: 'entry',
    price: 100,
    quantity: 10,
    fees: 0.05,
    executedAt: 1000,
    note: null
  };
}

function seedDemoState() {
  return {
    accounts: [demoAccount('demo-1', true), { ...demoAccount('demo-2'), name: 'Swing Account' }],
    trades: [trade('t1', 'demo-1'), trade('t2', 'demo-2')],
    executions: [execution('e1', 't1'), execution('e2', 't2')]
  };
}

beforeEach(async () => {
  await Promise.all([
    db.accounts.clear(),
    db.trades.clear(),
    db.executions.clear(),
    db.tags.clear(),
    db.tradeTags.clear(),
    db.dayNotes.clear(),
    db.notes.clear(),
    db.noteFolders.clear(),
    db.settings.clear()
  ]);
});

describe('purgeDemoData', () => {
  it('removes seeded demo accounts, trades, executions and shared demo content', async () => {
    const { accounts, trades, executions } = seedDemoState();
    await db.accounts.bulkPut(accounts);
    await db.trades.bulkPut(trades);
    await db.executions.bulkPut(executions);
    await db.tags.put({ id: 'tag1', name: 'Breakout', color: '#6C5CE7', category: 'setup', createdAt: 1 });
    await db.dayNotes.put({
      id: 'demo-1_2026-01-05',
      accountId: 'demo-1',
      date: '2026-01-05',
      preMarketPlan: '<p>demo</p>',
      postMarketReview: '',
      mood: null,
      createdAt: 1,
      updatedAt: 1
    });
    await db.notes.put({
      id: 'n1',
      title: 'My Trading Rules',
      content: '<p>This is my note about my trading rules.</p>',
      folderId: null,
      tags: [],
      linkedTradeIds: [],
      linkedDates: [],
      pinned: false,
      createdAt: 1,
      updatedAt: 1
    } as Note);
    await db.settings.put({
      key: 'app',
      theme: 'system',
      sidebarCollapsed: false,
      defaultAccountId: 'demo-1',
      lastDateRange: null,
      seeded: true
    });

    await purgeDemoData();

    expect(await db.accounts.count()).toBe(0);
    expect(await db.trades.count()).toBe(0);
    expect(await db.executions.count()).toBe(0);
    expect(await db.tags.count()).toBe(0);
    expect(await db.dayNotes.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
    const settings = await db.settings.get('app');
    expect(settings?.defaultAccountId).toBeNull();
  });

  it('does nothing when no demo accounts exist', async () => {
    await db.accounts.put(userAccount('user-1', true));
    await db.trades.put(trade('ut1', 'user-1'));

    await purgeDemoData();

    expect(await db.accounts.count()).toBe(1);
    expect(await db.trades.count()).toBe(1);
  });

  it('removes demo data but keeps user accounts, trades, tags and notes', async () => {
    await db.accounts.bulkPut([demoAccount('demo-1', true), userAccount('user-1')]);    await db.trades.bulkPut([trade('t1', 'demo-1'), trade('ut1', 'user-1')]);
    await db.executions.bulkPut([execution('e1', 't1'), execution('e2', 'ut1')]);
    await db.tags.put({ id: 'tag1', name: 'My Tag', color: '#123456', category: 'custom', createdAt: 1 });
    await db.notes.put({
      id: 'n1',
      title: 'My note',
      content: '<p>real</p>',
      folderId: null,
      tags: [],
      linkedTradeIds: [],
      linkedDates: [],
      pinned: false,
      createdAt: 1,
      updatedAt: 1
    } as Note);

    await purgeDemoData();

    const accounts = await db.accounts.toArray();
    expect(accounts).toHaveLength(1);
    const surviving = accounts[0];
    expect(surviving?.id).toBe('user-1');
    expect(surviving?.isDefault).toBe(true);
    const trades = await db.trades.toArray();
    expect(trades.map((t) => t.id)).toEqual(['ut1']);
    expect(await db.executions.toArray()).toEqual([expect.objectContaining({ id: 'e2' })]);
    expect(await db.tags.count()).toBe(1);
    expect(await db.notes.count()).toBe(1);
  });
});
