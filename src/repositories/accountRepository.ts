import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { AccountRepository } from './types';
import type { Account } from '@/types/trade';

export const accountRepository: AccountRepository = {
  async getAll() {
    return db.accounts.toArray();
  },

  async getById(id) {
    return db.accounts.get(id);
  },

  async getDefault() {
    const defaultAccount = await db.accounts.where('isDefault').equals(1).first();
    if (defaultAccount) return defaultAccount;
    return db.accounts.toCollection().first();
  },

  async create(account) {
    const id = account.id || generateId();
    const now = Date.now();
    await db.accounts.put({
      ...account,
      id,
      createdAt: now,
      updatedAt: now
    } as Account);
    return id;
  },

  async update(id, changes) {
    await db.accounts.update(id, { ...changes, updatedAt: Date.now() });
  },

  async delete(id) {
    await db.accounts.delete(id);
  }
};
