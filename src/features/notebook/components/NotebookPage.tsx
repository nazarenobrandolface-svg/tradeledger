import { useState, useMemo } from 'react';
import { useNotes } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Trash2, Pin, Search, Library, Folder } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export function NotebookPage() {
  const notes = useNotes();
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const folders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.folder) set.add(n.folder);
    });
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let list = [...notes];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s)
      );
    }
    if (folderFilter !== 'all') {
      list = list.filter((n) => n.folder === folderFilter);
    }
    return list;
  }, [notes, search, folderFilter]);

  const activeNote = notes.find((n) => n.id === selectedNote);

  const handleCreate = async () => {
    const id = await repositories.notes.createNote({
      id: generateId(),
      title: 'Untitled Note',
      content: '',
      folder: folderFilter !== 'all' ? folderFilter : null,
      tags: [],
      linkedTradeIds: [],
      linkedDates: [],
      pinned: false
    });
    setSelectedNote(id);
  };

  const handleUpdate = async (id: string, changes: Partial<{ title: string; content: string; folder: string | null; pinned: boolean }>) => {
    await repositories.notes.updateNote(id, changes);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this note?')) {
      await repositories.notes.deleteNote(id);
      if (selectedNote === id) setSelectedNote(null);
    }
  };

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={<Library className="h-12 w-12" />}
        title="No notes yet"
        description="Create your first note to start building your trading journal."
        action={{ label: 'New Note', onClick: handleCreate }}
      />
    );
  }

  return (
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="flex flex-col overflow-hidden">
        <div className="space-y-3 border-b p-4">
          <Button onClick={handleCreate} className="w-full" size="sm">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => setSelectedNote(note.id)}
              className={cn(
                'w-full border-b p-3 text-left transition-colors hover:bg-muted/50',
                selectedNote === note.id && 'bg-primary/5'
              )}
            >
              <div className="flex items-center gap-2">
                {note.pinned && <Pin className="h-3 w-3 text-primary" />}
                <span className="truncate text-sm font-medium">{note.title}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {note.folder && (
                  <span className="inline-flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {note.folder} ·
                  </span>
                )}{' '}
                {format(note.updatedAt, 'MMM d, yyyy')}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {activeNote ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <Input
                value={activeNote.title}
                onChange={(e) => handleUpdate(activeNote.id, { title: e.target.value })}
                className="max-w-md border-transparent bg-transparent text-lg font-semibold hover:border-input focus-visible:border-input"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUpdate(activeNote.id, { pinned: !activeNote.pinned })}
                >
                  <Pin className={cn('h-4 w-4', activeNote.pinned && 'fill-primary text-primary')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(activeNote.id)}
                >
                  <Trash2 className="h-4 w-4 text-loss" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 border-b p-3">
              <Select
                value={activeNote.folder ?? 'none'}
                onValueChange={(v) =>
                  handleUpdate(activeNote.id, { folder: v === 'none' ? null : v })
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Folder</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Create new folder..."
                className="w-[180px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) {
                      handleUpdate(activeNote.id, { folder: v });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            <Textarea
              value={activeNote.content}
              onChange={(e) => handleUpdate(activeNote.id, { content: e.target.value })}
              placeholder="Start writing..."
              className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Library className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
