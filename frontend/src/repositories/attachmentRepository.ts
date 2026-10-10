import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { AttachmentRepository } from './types';
import type { Attachment } from '@/types/note';

export const attachmentRepository: AttachmentRepository = {
  async getByTradeId(tradeId) {
    return db.attachments.where('tradeId').equals(tradeId).toArray();
  },

  async getByNoteId(noteId) {
    return db.attachments.where('noteId').equals(noteId).toArray();
  },

  async create(attachment) {
    const id = generateId();
    await db.attachments.put({ ...attachment, id, createdAt: Date.now() } as Attachment);
    return id;
  },

  async delete(id) {
    await db.attachments.delete(id);
  }
};
