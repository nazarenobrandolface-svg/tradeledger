import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import type { NoteRepository } from './types';
import type { DayNote, Note } from '@/types/note';

export const noteRepository: NoteRepository = {
  async getDayNotes() {
    return db.dayNotes.orderBy('date').reverse().toArray();
  },

  async getDayNote(accountId, date) {
    return db.dayNotes.get([accountId, date].join('_')) ?? db.dayNotes.where('date').equals(date).first();
  },

  async upsertDayNote(note) {
    const id = note.id || `${note.accountId}_${note.date}`;
    const existing = await db.dayNotes.get(id);
    const now = Date.now();
    await db.dayNotes.put({
      ...note,
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    } as DayNote);
  },

  async getNotes() {
    return db.notes.orderBy('updatedAt').reverse().toArray();
  },

  async getNoteById(id) {
    return db.notes.get(id);
  },

  async createNote(note) {
    const id = note.id || generateId();
    const now = Date.now();
    await db.notes.put({ ...note, id, createdAt: now, updatedAt: now } as Note);
    return id;
  },

  async updateNote(id, changes) {
    await db.notes.update(id, { ...changes, updatedAt: Date.now() });
  },

  async deleteNote(id) {
    await db.attachments.where('noteId').equals(id).delete();
    await db.notes.delete(id);
  }
};
