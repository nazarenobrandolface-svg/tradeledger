import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { TradeRepository } from './types';
import type { Trade, TradeWithExecutions } from '@/types/trade';

export const tradeRepository: TradeRepository = {
  async getAll() {
    return db.trades.toArray();
  },

  async getById(id) {
    return db.trades.get(id);
  },

  async getWithExecutions(id) {
    const trade = await db.trades.get(id);
    if (!trade) return undefined;
    const executions = await db.executions.where('tradeId').equals(id).toArray();
    return { ...trade, executions } as TradeWithExecutions;
  },

  async getManyWithExecutions(filters) {
    let query = db.trades.toCollection();

    if (filters?.accountId) {
      query = db.trades.where('accountId').equals(filters.accountId);
    }

    let trades = await query.toArray();

    if (filters?.dateFrom) {
      trades = trades.filter((t) => t.openedAt >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      trades = trades.filter((t) => t.openedAt <= filters.dateTo!);
    }
    if (filters?.symbol) {
      trades = trades.filter((t) => t.symbol.toLowerCase().includes(filters.symbol!.toLowerCase()));
    }
    if (filters?.side) {
      trades = trades.filter((t) => t.side === filters.side);
    }
    if (filters?.status) {
      trades = trades.filter((t) => t.status === filters.status);
    }

    // One indexed query for all executions instead of one round-trip per
    // trade (the old loop issued N IDB queries — very slow on large books).
    const tradeIds = trades.map((t) => t.id);
    const executions = tradeIds.length
      ? await db.executions.where('tradeId').anyOf(tradeIds).toArray()
      : [];
    const byTrade = new Map<string, typeof executions>();
    for (const execution of executions) {
      const bucket = byTrade.get(execution.tradeId);
      if (bucket) bucket.push(execution);
      else byTrade.set(execution.tradeId, [execution]);
    }
    for (const bucket of byTrade.values()) {
      bucket.sort((a, b) => a.executedAt - b.executedAt);
    }

    return trades.map((trade) => ({
      ...trade,
      executions: byTrade.get(trade.id) ?? []
    }));
  },

  async getByAccount(accountId) {
    return db.trades.where('accountId').equals(accountId).toArray();
  },

  async getByDateRange(from, to) {
    return db.trades.where('openedAt').between(from, to, true, true).toArray();
  },

  async getOpen() {
    return db.trades.where('status').equals('open').toArray();
  },

  async create(trade) {
    const id = trade.id || generateId();
    const now = Date.now();
    await db.trades.put({
      ...trade,
      id,
      createdAt: now,
      updatedAt: now
    } as Trade);
    return id;
  },

  async update(id, changes) {
    await db.trades.update(id, { ...changes, updatedAt: Date.now() });
  },

  async delete(id) {
    await db.executions.where('tradeId').equals(id).delete();
    await db.tradeTags.where('tradeId').equals(id).delete();
    await db.trades.delete(id);
  },

  async bulkDelete(ids) {
    await db.transaction('rw', db.trades, db.executions, db.tradeTags, async () => {
      for (const id of ids) {
        await db.executions.where('tradeId').equals(id).delete();
        await db.tradeTags.where('tradeId').equals(id).delete();
        await db.trades.delete(id);
      }
    });
  }
};
