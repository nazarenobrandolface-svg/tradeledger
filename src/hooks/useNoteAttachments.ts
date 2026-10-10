import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { repositories } from '@/repositories';
import type { Attachment } from '@/types/note';

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/** Clipboard files can arrive nameless — give them a stable, dated name. */
function displayName(file: File): string {
  if (file.name) return file.name;
  const subtype = (file.type.split('/')[1] ?? 'bin').replace('jpeg', 'jpg');
  return `screenshot-${new Date().toISOString().slice(0, 10)}.${subtype}`;
}

export function useNoteAttachments(noteId: string) {
  const attachments = useLiveQuery(
    () => repositories.attachments.getByNoteId(noteId),
    [noteId],
    [] as Attachment[]
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setError(null);

      const oversized = files.filter((f) => f.size > MAX_ATTACHMENT_SIZE);
      const valid = files.filter((f) => f.size <= MAX_ATTACHMENT_SIZE);
      const skipped = oversized.map((f) => f.name).join(', ');
      if (skipped) {
        setError(`"${skipped}" is over the 25 MB limit and was skipped.`);
      }
      if (valid.length === 0) return;

      setUploading(true);
      try {
        for (const file of valid) {
          await repositories.attachments.create({
            noteId,
            tradeId: null,
            dayNoteId: null,
            fileName: displayName(file),
            mimeType: file.type || 'application/octet-stream',
            blob: file,
            size: file.size
          });
        }
      } catch {
        setError('Could not save the file — browser storage may be full.');
      } finally {
        setUploading(false);
      }
    },
    [noteId]
  );

  const remove = useCallback((id: string) => {
    void repositories.attachments.delete(id);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { attachments, uploading, error, uploadFiles, remove, clearError };
}
