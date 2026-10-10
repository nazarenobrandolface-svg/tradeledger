import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { noteRepository } from '@/repositories/noteRepository';

const baseNote = {
  id: '',
  title: '',
  content: '',
  folderId: null as string | null,
  tags: [] as string[],
  linkedTradeIds: [] as string[],
  linkedDates: [] as string[],
  pinned: false
};

beforeEach(async () => {
  await db.notes.clear();
  await db.noteFolders.clear();
  await db.attachments.clear();
});

describe('noteRepository notes', () => {
  it('creates and reads a note with timestamps', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'My plan' });
    const note = await noteRepository.getNoteById(id);
    expect(note?.title).toBe('My plan');
    expect(note?.createdAt).toBeGreaterThan(0);
    expect(note?.updatedAt).toBeGreaterThan(0);
  });

  it('sanitizes HTML on create and update', async () => {
    const id = await noteRepository.createNote({
      ...baseNote,
      content: '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>'
    });
    const created = await noteRepository.getNoteById(id);
    expect(created?.content).toContain('<p>ok</p>');
    expect(created?.content).not.toContain('script');
    expect(created?.content).not.toContain('onerror');

    await noteRepository.updateNote(id, { content: '<b>bold</b><iframe src="evil"></iframe>' });
    const updated = await noteRepository.getNoteById(id);
    expect(updated?.content).toContain('<b>bold</b>');
    expect(updated?.content).not.toContain('iframe');
  });

  it('bumps updatedAt on update', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'a' });
    const before = (await noteRepository.getNoteById(id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await noteRepository.updateNote(id, { title: 'b' });
    const after = (await noteRepository.getNoteById(id))!;
    expect(after.updatedAt).toBeGreaterThan(before);
    expect(after.title).toBe('b');
  });

  it('deletes a note', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'bye' });
    await noteRepository.deleteNote(id);
    expect(await noteRepository.getNoteById(id)).toBeUndefined();
  });

  it('sorts pinned notes first, then by updatedAt', async () => {
    const older = await noteRepository.createNote({ ...baseNote, title: 'older' });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await noteRepository.createNote({ ...baseNote, title: 'newer' });
    await noteRepository.updateNote(older, { pinned: true });

    const notes = await noteRepository.getNotes();
    expect(notes[0]?.id).toBe(older);
    expect(notes[1]?.id).toBe(newer);
  });
});

describe('noteRepository search', () => {
  beforeEach(async () => {
    await noteRepository.createNote({
      ...baseNote,
      id: 'n1',
      title: 'Risk rules',
      content: '<h2>Stop loss</h2><p>Never risk more than 1%</p>'
    });
    await noteRepository.createNote({
      ...baseNote,
      id: 'n2',
      title: 'Journal',
      content: '<p>Felt patient today</p>'
    });
  });

  it('matches on title', async () => {
    const results = await noteRepository.searchNotes({ query: 'risk' });
    expect(results.map((n) => n.id)).toEqual(['n1']);
  });

  it('matches on visible text but not on HTML tags', async () => {
    const byText = await noteRepository.searchNotes({ query: 'stop loss' });
    expect(byText.map((n) => n.id)).toEqual(['n1']);

    const byTag = await noteRepository.searchNotes({ query: 'h2' });
    expect(byTag).toHaveLength(0);
  });

  it('filters by folder', async () => {
    const folderId = await noteRepository.createFolder('Strategy');
    await noteRepository.updateNote('n1', { folderId });
    const inFolder = await noteRepository.searchNotes({ folderId });
    expect(inFolder.map((n) => n.id)).toEqual(['n1']);

    const all = await noteRepository.searchNotes({});
    expect(all).toHaveLength(2);
  });
});

describe('noteRepository folders', () => {
  it('creates, renames and lists folders', async () => {
    const id = await noteRepository.createFolder(' Reviews ');
    const folders = await noteRepository.getFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0]?.name).toBe('Reviews');

    await noteRepository.renameFolder(id, 'Weekly');
    expect((await noteRepository.getFolders())[0]?.name).toBe('Weekly');
  });

  it('reuses an existing folder name instead of duplicating it', async () => {
    const a = await noteRepository.createFolder('Ideas');
    const b = await noteRepository.createFolder('Ideas');
    expect(a).toBe(b);
    expect(await noteRepository.getFolders()).toHaveLength(1);
  });

  it('rejects blank folder names', async () => {
    await expect(noteRepository.createFolder('   ')).rejects.toThrow();
    await expect(noteRepository.renameFolder('x', '')).rejects.toThrow();
  });

  it('keeps notes when deleting a folder (keepNotes)', async () => {
    const folderId = await noteRepository.createFolder('Old');
    const noteId = await noteRepository.createNote({ ...baseNote, folderId });
    await noteRepository.deleteFolder(folderId, 'keepNotes');

    expect(await noteRepository.getFolders()).toHaveLength(0);
    expect((await noteRepository.getNoteById(noteId))?.folderId).toBeNull();
  });

  it('deletes the notes when asked (deleteNotes)', async () => {
    const folderId = await noteRepository.createFolder('Trash');
    const noteId = await noteRepository.createNote({ ...baseNote, folderId });
    await noteRepository.deleteFolder(folderId, 'deleteNotes');

    expect(await noteRepository.getNoteById(noteId)).toBeUndefined();
  });

  it('renaming a folder does not orphan its notes', async () => {
    const folderId = await noteRepository.createFolder('Drafts');
    const noteId = await noteRepository.createNote({ ...baseNote, folderId });
    await noteRepository.renameFolder(folderId, 'Published');
    expect((await noteRepository.getNoteById(noteId))?.folderId).toBe(folderId);
  });
});

describe('noteRepository tags and links', () => {
  it('trims and de-duplicates tags', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'tagged' });
    await noteRepository.setNoteTags(id, [' setup ', 'setup', 'breakout', '']);
    expect((await noteRepository.getNoteById(id))?.tags).toEqual(['setup', 'breakout']);
  });

  it('links and unlinks trades', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'linked' });
    await noteRepository.linkTrade(id, 'trade-1');
    await noteRepository.linkTrade(id, 'trade-1'); // idempotent
    expect((await noteRepository.getNoteById(id))?.linkedTradeIds).toEqual(['trade-1']);
    expect(await noteRepository.getNotesForTrade('trade-1')).toHaveLength(1);

    await noteRepository.unlinkTrade(id, 'trade-1');
    expect((await noteRepository.getNoteById(id))?.linkedTradeIds).toEqual([]);
  });

  it('links and unlinks trading days', async () => {
    const id = await noteRepository.createNote({ ...baseNote, title: 'day note' });
    await noteRepository.linkDate(id, '2026-01-15');
    expect(await noteRepository.getNotesForDate('2026-01-15')).toHaveLength(1);

    await noteRepository.unlinkDate(id, '2026-01-15');
    expect(await noteRepository.getNotesForDate('2026-01-15')).toHaveLength(0);
  });
});

describe('noteRepository day notes', () => {
  it('upserts a day note without losing createdAt', async () => {
    await noteRepository.upsertDayNote({
      id: '',
      accountId: 'acc-1',
      date: '2026-02-01',
      preMarketPlan: '<p>plan</p>',
      postMarketReview: '',
      mood: null
    });
    const first = (await noteRepository.getDayNote('acc-1', '2026-02-01'))!;
    expect(first.id).toBe('acc-1_2026-02-01');

    await noteRepository.upsertDayNote({
      id: first.id,
      accountId: 'acc-1',
      date: '2026-02-01',
      preMarketPlan: '<p>plan v2</p>',
      postMarketReview: '<p>done</p>',
      mood: '😊'
    });
    const second = (await noteRepository.getDayNote('acc-1', '2026-02-01'))!;
    expect(second.postMarketReview).toBe('<p>done</p>');
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
  });
});
