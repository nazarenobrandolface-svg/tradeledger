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
    if (filters?.playbookId) {
      trades = trades.filter((t) => t.playbookId === filters.playbookId);
    }

    const results: TradeWithExecutions[] = [];
    for (const trade of trades) {
      const executions = await db.executions.where('tradeId').equals(trade.id).toArray();
      results.push({ ...trade, executions });
    }

    return results;
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
