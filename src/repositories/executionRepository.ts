import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { ExecutionRepository } from './types';
import type { Execution } from '@/types/trade';

export const executionRepository: ExecutionRepository = {
  async getByTradeId(tradeId) {
    return db.executions.where('tradeId').equals(tradeId).sortBy('executedAt');
  },

  async create(execution) {
    const id = generateId();
    await db.executions.put({ ...execution, id } as Execution);
    return id;
  },

  async update(id, changes) {
    await db.executions.update(id, changes);
  },

  async delete(id) {
    await db.executions.delete(id);
  }
};
