import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { ImportTemplateRepository } from './types';
import type { ImportTemplate } from '@/types/settings';

export const importTemplateRepository: ImportTemplateRepository = {
  async getAll() {
    return db.importTemplates.toArray();
  },

  async getById(id) {
    return db.importTemplates.get(id);
  },

  async create(template) {
    const id = generateId();
    await db.importTemplates.put({ ...template, id, createdAt: Date.now() } as ImportTemplate);
    return id;
  },

  async update(id, changes) {
    await db.importTemplates.update(id, changes);
  },

  async delete(id) {
    await db.importTemplates.delete(id);
  }
};
