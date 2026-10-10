import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNoteFolders, useNoteSearch, useTradeList } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderSidebar } from './FolderSidebar';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { Library } from 'lucide-react';

export function NotebookPage() {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link (?note=<id>) from trade detail / day drawer: select that note
  // and clear any filter that might hide it.
  const deepLinkedNote = searchParams.get('note');
  useEffect(() => {
    if (!deepLinkedNote) return;
    setSelectedNoteId(deepLinkedNote);
    setQueryInput('');
    setQuery('');
    setFolderFilter(null);
    setMobileView('editor');
    setSearchParams({}, { replace: true });
  }, [deepLinkedNote, setSearchParams]);

  const folders = useNoteFolders() ?? [];
  const notes = useNoteSearch(query, folderFilter);
  const trades = useTradeList();
  const loading = notes === undefined;

  // Debounce the search so we don't hit IndexedDB on every keystroke.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setQuery(queryInput), 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [queryInput]);

  const visibleNotes = useMemo(() => notes ?? [], [notes]);

  // The editor reads the note directly so a filter that hides the selected
  // note never blanks the editor.
  const activeNote = useLiveQuery(
    () => (selectedNoteId ? repositories.notes.getNoteById(selectedNoteId) : undefined),
    [selectedNoteId]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    visibleNotes.forEach((n) => {
      if (n.folderId) map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1);
    });
    return map;
  }, [visibleNotes]);

  const handleCreate = async () => {
    const id = await repositories.notes.createNote({
      id: generateId(),
      title: '',
      content: '',
      folderId: folderFilter,
      tags: [],
      linkedTradeIds: [],
      linkedDates: [],
      pinned: false
    });
    setSelectedNoteId(id);
    setMobileView('editor');
  };

  const handleSave = async (changes: Parameters<typeof repositories.notes.updateNote>[1]) => {
    if (!selectedNoteId) return;
    await repositories.notes.updateNote(selectedNoteId, changes);
  };

  const handleDelete = async () => {
    if (!selectedNoteId) return;
    await repositories.notes.deleteNote(selectedNoteId);
    setSelectedNoteId(null);
    setMobileView('list');
  };

  const handleSelect = (id: string) => {
    setSelectedNoteId(id);
    setMobileView('editor');
  };

  const empty =
    !loading && visibleNotes.length === 0 && folders.length === 0 && query === '';

  if (empty) {
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
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-4 lg:grid-cols-[200px_300px_1fr]">
      {/* Folders — desktop only; on mobile they live behind the note list */}
      <Card className="hidden overflow-hidden lg:block">
        <FolderSidebar
          folders={folders}
          counts={counts}
          totalCount={visibleNotes.length}
          selectedFolderId={folderFilter}
          onSelect={setFolderFilter}
          onCreate={async (name) => {
            await repositories.notes.createFolder(name);
          }}
          onRename={(id, name) => repositories.notes.renameFolder(id, name)}
          onDelete={(id, mode) => repositories.notes.deleteFolder(id, mode)}
        />
      </Card>

      {/* Note list */}
      <Card
        className={`overflow-hidden ${mobileView === 'editor' && activeNote ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="flex h-full w-full flex-col">
          <div className="border-b px-3 py-2 lg:hidden">
            <FolderSelectInline
              folders={folders}
              value={folderFilter}
              onChange={setFolderFilter}
              counts={counts}
              totalCount={visibleNotes.length}
            />
          </div>
          <div className="min-h-0 flex-1">
            <NoteList
              notes={visibleNotes}
              query={queryInput}
              onQueryChange={setQueryInput}
              selectedNoteId={selectedNoteId}
              onSelect={handleSelect}
              onCreate={handleCreate}
              loading={loading}
            />
          </div>
        </div>
      </Card>

      {/* Editor */}
      <Card className={`overflow-hidden ${activeNote ? 'flex' : 'hidden lg:flex'}`}>
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            folders={folders}
            trades={trades.map((t) => ({ id: t.id, symbol: t.symbol }))}
            save={handleSave}
            onDelete={handleDelete}
            onBack={() => setMobileView('list')}
          />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center text-muted-foreground">
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

function FolderSelectInline({
  folders,
  value,
  onChange,
  counts,
  totalCount
}: {
  folders: Array<{ id: string; name: string }>;
  value: string | null;
  onChange: (id: string | null) => void;
  counts: Map<string, number>;
  totalCount: number;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      aria-label="Filter by folder"
    >
      <option value="">All notes ({totalCount})</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name} ({counts.get(f.id) ?? 0})
        </option>
      ))}
    </select>
  );
}
