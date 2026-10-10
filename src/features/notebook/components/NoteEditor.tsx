import { useEffect, useRef, useState, type DragEvent } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Pin,
  Trash2,
  Link2,
  X,
  CalendarDays,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { NoteAttachments } from './NoteAttachments';
import { useNoteAttachments } from '@/hooks/useNoteAttachments';
import type { Note, NoteFolder } from '@/types/note';

interface NoteEditorProps {
  note: Note;
  folders: NoteFolder[];
  trades: Array<{ id: string; symbol: string }>;
  save: (changes: Partial<Note>) => Promise<void>;
  onDelete: () => Promise<void>;
  onBack?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export function NoteEditor({ note, folders, trades, save, onDelete, onBack }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [tagInput, setTagInput] = useState('');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedNoteId = useRef(note.id);
  const { attachments, uploading, error, uploadFiles, remove, clearError } =
    useNoteAttachments(note.id);

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');

  // Reset local drafts when a different note is selected.
  useEffect(() => {
    mountedNoteId.current = note.id;
    setTitle(note.title);
    setContent(note.content);
    setStatus('idle');
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, [note.id, note.title, note.content]);

  const runSave = async (changes: Partial<Note>) => {
    setStatus('saving');
    try {
      await save(changes);
      if (mountedNoteId.current === note.id) setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => void runSave({ title: value }), 500);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || note.tags.includes(tag)) {
      setTagInput('');
      return;
    }
    void runSave({ tags: [...note.tags, tag] });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    void runSave({ tags: note.tags.filter((t) => t !== tag) });
  };

  const addTradeLink = (tradeId: string) => {
    if (!tradeId || note.linkedTradeIds.includes(tradeId)) return;
    void runSave({ linkedTradeIds: [...note.linkedTradeIds, tradeId] });
  };

  const addDateLink = (date: string) => {
    if (!date || note.linkedDates.includes(date)) return;
    void runSave({ linkedDates: [...note.linkedDates, date] });
  };

  const linkedTrades = trades.filter((t) => note.linkedTradeIds.includes(t.id));

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        void uploadFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary">
          Drop to attach
        </div>
      )}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to notes</span>
          </Button>
        )}
        <div className="flex-1 truncate text-sm">
          {folders.find((f) => f.id === note.folderId)?.name ?? 'No folder'}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
          {status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status === 'saved' && <CheckCircle2 className="h-3.5 w-3.5 text-profit" />}
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          aria-pressed={note.pinned}
          onClick={() => void runSave({ pinned: !note.pinned })}
        >
          <Pin className={note.pinned ? 'h-4 w-4 text-primary' : 'h-4 w-4'} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-loss hover:text-loss"
          aria-label="Delete note"
          onClick={() => setPendingDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 lg:p-4">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="mb-3 w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/60"
          aria-label="Note title"
        />

        <RichTextEditor
          value={content}
          onChange={setContent}
          onIdle={() => void runSave({ content })}
          onImagePaste={(files) => void uploadFiles(files)}
          placeholder="Start writing. Use the toolbar for formatting."
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border p-2">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={note.tags.length ? '' : 'Add a tag…'}
                className="min-w-[80px] flex-1 bg-transparent text-sm outline-none"
                aria-label="Add tag"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Link to trade
            </label>
            <div className="flex gap-2">
              <select
                value=""
                onChange={(e) => addTradeLink(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="Select a trade to link"
              >
                <option value="">Choose a trade…</option>
                {trades
                  .filter((t) => !note.linkedTradeIds.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.symbol}
                    </option>
                  ))}
              </select>
            </div>
            {linkedTrades.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {linkedTrades.map((t) => (
                  <Badge key={t.id} variant="outline" className="gap-1 pr-1">
                    <Link2 className="h-3 w-3" />
                    {t.symbol}
                    <button
                      onClick={() =>
                        void runSave({
                          linkedTradeIds: note.linkedTradeIds.filter((id) => id !== t.id)
                        })
                      }
                      aria-label={`Unlink ${t.symbol}`}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Link to trading day
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    addDateLink(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                aria-label="Select a date to link"
              />
            </div>
            {note.linkedDates.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {note.linkedDates
                  .slice()
                  .sort()
                  .map((date) => (
                    <Badge key={date} variant="outline" className="gap-1 pr-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(date + 'T00:00:00'), 'MMM d, yyyy')}
                      <button
                        onClick={() => void runSave({ linkedDates: note.linkedDates.filter((d) => d !== date) })}
                        aria-label={`Unlink ${date}`}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="note-folder"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Folder
            </label>
            <select
              id="note-folder"
              value={note.folderId ?? ''}
              onChange={(e) => void runSave({ folderId: e.target.value || null })}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <NoteAttachments
          attachments={attachments}
          uploading={uploading}
          error={error}
          dragging={dragging}
          onUpload={(files) => void uploadFiles(files)}
          onDelete={remove}
          onDismissError={clearError}
        />

        <p className="mt-4 text-xs text-muted-foreground">
          Updated {format(note.updatedAt, 'MMM d, yyyy HH:mm')}
        </p>
      </div>

      <ConfirmDialog
        open={pendingDelete}
        title="Delete this note?"
        description="This permanently removes the note. This cannot be undone."
        confirmLabel="Delete note"
        destructive
        onConfirm={async () => {
          setPendingDelete(false);
          await onDelete();
        }}
        onCancel={() => setPendingDelete(false)}
      />
    </div>
  );
}
