import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Attachment } from '@/types/note';
import {
  AlertCircle,
  Download,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react';

const ACCEPT = 'image/*,.pdf,.csv,.txt,.json,.md,.doc,.docx,.xls,.xlsx';

interface NoteAttachmentsProps {
  attachments: Attachment[];
  uploading: boolean;
  error: string | null;
  dragging: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (id: string) => void;
  onDismissError: () => void;
}

const isImage = (a: Attachment) => a.mimeType.startsWith('image/');

function FileGlyph({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <FileText className="h-6 w-6" />;
  if (mimeType === 'text/csv' || mimeType.includes('sheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-6 w-6" />;
  }
  if (mimeType.startsWith('text/') || mimeType.includes('markdown')) {
    return <FileText className="h-6 w-6" />;
  }
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-6 w-6" />;
  return <FileIcon className="h-6 w-6" />;
}

export function NoteAttachments({
  attachments,
  uploading,
  error,
  dragging,
  onUpload,
  onDelete,
  onDismissError
}: NoteAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Object URLs are view-scoped: build them for the current list and revoke
  // whenever it changes so blobs never leak across note switches.
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const created: string[] = [];
    const map: Record<string, string> = {};
    for (const a of attachments) {
      const url = URL.createObjectURL(a.blob);
      map[a.id] = url;
      created.push(url);
    }
    setUrls(map);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [attachments]);

  const openPicker = () => inputRef.current?.click();

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onUpload(files);
  };

  const download = (a: Attachment) => {
    const url = urls[a.id];
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = a.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const preview = attachments.find((a) => a.id === previewId) ?? null;
  const pending = attachments.find((a) => a.id === pendingDelete) ?? null;

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-xs font-medium text-muted-foreground">Attachments</span>
        <span className="text-xs text-muted-foreground">
          {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-loss/30 bg-loss/10 px-2.5 py-2 text-xs text-loss">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="rounded p-0.5 hover:bg-loss/20"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'rounded-md border p-2 transition-colors',
          dragging && 'border-dashed border-primary bg-primary/5'
        )}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
      >
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-3 py-6 text-center">
            <Paperclip className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Drop files or screenshots here to document this note
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPicker}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload file
            </Button>
            <p className="text-[11px] text-muted-foreground/70">
              Or paste a screenshot with Ctrl+V
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {attachments.map((a) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                aria-label={isImage(a) ? `Preview ${a.fileName}` : `Download ${a.fileName}`}
                title={a.fileName}
                onClick={() => (isImage(a) ? setPreviewId(a.id) : download(a))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isImage(a)) setPreviewId(a.id);
                    else download(a);
                  }
                }}
                className={cn(
                  'group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-muted/30 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                {isImage(a) && urls[a.id] ? (
                  <img
                    src={urls[a.id]}
                    alt={a.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-muted-foreground">
                    <FileGlyph mimeType={a.mimeType} />
                    <span className="line-clamp-2 w-full break-all text-[10px] leading-tight">
                      {a.fileName}
                    </span>
                  </div>
                )}

                <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {formatFileSize(a.size)}
                </span>

                <button
                  type="button"
                  aria-label={`Delete ${a.fileName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(a.id);
                  }}
                  className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-loss opacity-0 transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              aria-label="Add file"
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              <span className="text-[10px]">Add</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Image preview */}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] gap-3 p-4 sm:max-w-3xl">
          <DialogTitle className="truncate pr-8 text-sm font-semibold">
            {preview?.fileName}
          </DialogTitle>
          {preview && (
            <>
              <img
                src={urls[preview.id]}
                alt={preview.fileName}
                className="mx-auto max-h-[65vh] rounded-md object-contain"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(preview.size)} · {format(preview.createdAt, 'MMM d, yyyy HH:mm')}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => download(preview)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setPreviewId(null);
                      setPendingDelete(preview.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this file?"
        description={`This permanently removes "${pending?.fileName ?? ''}" from this note.`}
        confirmLabel="Delete file"
        destructive
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
