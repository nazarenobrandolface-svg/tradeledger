import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { TagRepository } from './types';
import type { Tag } from '@/types/tag';

export const tagRepository: TagRepository = {
  async getAll() {
    return db.tags.toArray();
  },

  async getByCategory(category) {
    return db.tags.where('category').equals(category).toArray();
  },

  async create(tag) {
    const id = tag.id || generateId();
    await db.tags.put({ ...tag, id, createdAt: Date.now() } as Tag);
    return id;
  },

  async update(id, changes) {
    await db.tags.update(id, changes);
  },

  async delete(id) {
    await db.tradeTags.where('tagId').equals(id).delete();
    await db.tags.delete(id);
  },

  async getAllTradeTags() {
    return db.tradeTags.toArray();
  },

  async getTagsForTrade(tradeId) {
    const tradeTags = await db.tradeTags.where('tradeId').equals(tradeId).toArray();
    const tagIds = tradeTags.map((tt) => tt.tagId);
    return db.tags.where('id').anyOf(tagIds).toArray();
  },

  async addTagToTrade(tradeId, tagId) {
    const existing = await db.tradeTags.get([tradeId, tagId]);
    if (!existing) {
      await db.tradeTags.put({ tradeId, tagId });
    }
  },

  async removeTagFromTrade(tradeId, tagId) {
    await db.tradeTags.delete([tradeId, tagId]);
  }
};
