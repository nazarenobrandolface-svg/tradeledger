import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import { htmlToPlainText, sanitizeHtml } from '@/lib/html';
import type { NoteRepository } from './types';
import type { DayNote, FolderDeleteMode, Note } from '@/types/note';

export const noteRepository: NoteRepository = {
  async getDayNotes() {
    return db.dayNotes.orderBy('date').reverse().toArray();
  },

  async getDayNote(accountId, date) {
    const byId = await db.dayNotes.get(`${accountId}_${date}`);
    if (byId) return byId;
    return db.dayNotes.where('date').equals(date).first();
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

  async getFolders() {
    return db.noteFolders.orderBy('name').toArray();
  },

  async createFolder(name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Folder name is required');
    const existing = await db.noteFolders.where('name').equals(trimmed).first();
    if (existing) return existing.id;
    const id = generateId();
    await db.noteFolders.put({ id, name: trimmed, createdAt: Date.now() });
    return id;
  },

  async renameFolder(id, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Folder name is required');
    await db.noteFolders.update(id, { name: trimmed });
  },

  async deleteFolder(id, mode: FolderDeleteMode = 'keepNotes') {
    await db.transaction('rw', [db.noteFolders, db.notes, db.attachments], async () => {
      if (mode === 'deleteNotes') {
        const notes = await db.notes.where('folderId').equals(id).toArray();
        for (const note of notes) {
          await db.attachments.where('noteId').equals(note.id).delete();
        }
        await db.notes.where('folderId').equals(id).delete();
      } else {
        await db.notes.where('folderId').equals(id).modify({ folderId: null });
      }
      await db.noteFolders.delete(id);
    });
  },

  async getNotes() {
    const notes = await db.notes.toArray();
    return notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  },

  async getNoteById(id) {
    return db.notes.get(id);
  },

  async searchNotes({ query, folderId }) {
    let notes = await db.notes.toArray();
    if (folderId) {
      notes = notes.filter((n) => n.folderId === folderId);
    }
    const q = (query ?? '').trim().toLowerCase();
    if (q) {
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) || htmlToPlainText(n.content).toLowerCase().includes(q)
      );
    }
    return notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  },

  async createNote(note) {
    const id = note.id || generateId();
    const now = Date.now();
    await db.notes.put({
      ...note,
      id,
      content: sanitizeHtml(note.content ?? ''),
      createdAt: now,
      updatedAt: now
    } as Note);
    return id;
  },

  async updateNote(id, changes) {
    const next = { ...changes };
    if (typeof next.content === 'string') next.content = sanitizeHtml(next.content);
    await db.notes.update(id, { ...next, updatedAt: Date.now() } as Partial<Note>);
  },

  async deleteNote(id) {
    await db.attachments.where('noteId').equals(id).delete();
    await db.notes.delete(id);
  },

  async setNoteTags(id, tags) {
    const unique = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
    await db.notes.update(id, { tags: unique, updatedAt: Date.now() });
  },

  async linkTrade(noteId, tradeId) {
    const note = await db.notes.get(noteId);
    if (!note || note.linkedTradeIds.includes(tradeId)) return;
    await db.notes.update(noteId, {
      linkedTradeIds: [...note.linkedTradeIds, tradeId],
      updatedAt: Date.now()
    });
  },

  async unlinkTrade(noteId, tradeId) {
    const note = await db.notes.get(noteId);
    if (!note) return;
    await db.notes.update(noteId, {
      linkedTradeIds: note.linkedTradeIds.filter((t) => t !== tradeId),
      updatedAt: Date.now()
    });
  },

  async linkDate(noteId, date) {
    const note = await db.notes.get(noteId);
    if (!note || note.linkedDates.includes(date)) return;
    await db.notes.update(noteId, {
      linkedDates: [...note.linkedDates, date],
      updatedAt: Date.now()
    });
  },

  async unlinkDate(noteId, date) {
    const note = await db.notes.get(noteId);
    if (!note) return;
    await db.notes.update(noteId, {
      linkedDates: note.linkedDates.filter((d) => d !== date),
      updatedAt: Date.now()
    });
  },

  async getNotesForTrade(tradeId) {
    const notes = await db.notes.toArray();
    return notes
      .filter((n) => n.linkedTradeIds.includes(tradeId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getNotesForDate(date) {
    const notes = await db.notes.toArray();
    return notes
      .filter((n) => n.linkedDates.includes(date))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
};
