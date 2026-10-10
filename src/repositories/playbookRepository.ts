import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { PlaybookRepository } from './types';
import type { Playbook } from '@/types/playbook';

export const playbookRepository: PlaybookRepository = {
  async getAll() {
    return db.playbooks.toArray();
  },

  async getById(id) {
    return db.playbooks.get(id);
  },

  async create(playbook) {
    const id = playbook.id || generateId();
    const now = Date.now();
    await db.playbooks.put({ ...playbook, id, createdAt: now, updatedAt: now } as Playbook);
    return id;
  },

  async update(id, changes) {
    await db.playbooks.update(id, { ...changes, updatedAt: Date.now() });
  },

  async delete(id) {
    await db.trades.where('playbookId').equals(id).modify({ playbookId: null });
    await db.playbooks.delete(id);
  }
};
