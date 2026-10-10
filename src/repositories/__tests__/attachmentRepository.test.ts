import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { attachmentRepository } from '@/repositories/attachmentRepository';
import { noteRepository } from '@/repositories/noteRepository';

const baseAttachment = {
  tradeId: null,
  noteId: 'note-1' as string | null,
  dayNoteId: null,
  fileName: 'chart.png',
  mimeType: 'image/png',
  blob: new Blob(['fake-png'], { type: 'image/png' }),
  size: 8
};

beforeEach(async () => {
  await db.attachments.clear();
  await db.notes.clear();
});

describe('attachmentRepository', () => {
  it('creates an attachment with id, blob and timestamp', async () => {
    const id = await attachmentRepository.create(baseAttachment);
    const stored = await attachmentRepository.getByNoteId('note-1');
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(id);
    expect(stored[0]?.fileName).toBe('chart.png');
    expect(stored[0]?.size).toBe(8);
    expect(stored[0]?.createdAt).toBeGreaterThan(0);
  });

  it('returns only the requested note’s attachments', async () => {
    await attachmentRepository.create(baseAttachment);
    await attachmentRepository.create({ ...baseAttachment, noteId: 'note-2' });
    expect(await attachmentRepository.getByNoteId('note-1')).toHaveLength(1);
    expect(await attachmentRepository.getByNoteId('note-2')).toHaveLength(1);
    expect(await attachmentRepository.getByNoteId('missing')).toHaveLength(0);
  });

  it('deletes a single attachment', async () => {
    const id = await attachmentRepository.create(baseAttachment);
    await attachmentRepository.delete(id);
    expect(await attachmentRepository.getByNoteId('note-1')).toHaveLength(0);
  });

  it('cascades when the owning note is deleted', async () => {
    const noteId = await noteRepository.createNote({
      id: '',
      title: 'With files',
      content: '',
      folderId: null,
      tags: [],
      linkedTradeIds: [],
      linkedDates: [],
      pinned: false
    });
    await attachmentRepository.create({ ...baseAttachment, noteId });
    expect(await attachmentRepository.getByNoteId(noteId)).toHaveLength(1);

    await noteRepository.deleteNote(noteId);
    expect(await attachmentRepository.getByNoteId(noteId)).toHaveLength(0);
  });
});
