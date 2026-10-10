import { formatDistanceToNow } from 'date-fns';
import { Pin, FileText, Search, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { htmlToPlainText } from '@/lib/html';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Note } from '@/types/note';

interface NoteListProps {
  notes: Note[];
  query: string;
  onQueryChange: (q: string) => void;
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
}

export function NoteList({
  notes,
  query,
  onQueryChange,
  selectedNoteId,
  onSelect,
  onCreate,
  loading
}: NoteListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search notes…"
            className="pl-8 pr-8"
            aria-label="Search notes"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button size="sm" className="w-full" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New note
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="skeleton mb-2 h-4 w-2/3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton mt-1 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {query ? 'No notes match your search.' : 'No notes here yet.'}
            </p>
            {!query && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Create your first note
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((note) => {
              const preview = htmlToPlainText(note.content).slice(0, 90);
              return (
                <li key={note.id}>
                  <button
                    onClick={() => onSelect(note.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      selectedNoteId === note.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'bg-card hover:bg-muted/60'
                    )}
                    aria-current={selectedNoteId === note.id ? 'true' : undefined}
                  >
                    <div className="flex items-start gap-2">
                      {note.pinned && (
                        <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-label="Pinned" />
                      )}
                      <span className="flex-1 truncate text-sm font-medium">
                        {note.title || 'Untitled'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {preview || 'Empty note'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                          {tag}
                        </Badge>
                      ))}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
