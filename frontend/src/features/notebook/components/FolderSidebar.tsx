import { useState } from 'react';
import { Folder, FolderPlus, MoreHorizontal, Pencil, Trash2, Files } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { NoteFolder } from '@/types/note';

interface FolderSidebarProps {
  folders: NoteFolder[];
  counts: Map<string, number>;
  totalCount: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string, mode: 'keepNotes' | 'deleteNotes') => Promise<void>;
}

export function FolderSidebar({
  folders,
  counts,
  totalCount,
  selectedFolderId,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<NoteFolder | null>(null);

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setCreating(false);
      return;
    }
    await onCreate(name);
    setNewName('');
    setCreating(false);
  };

  const submitRename = async () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) await onRename(renamingId, name);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="New folder"
          onClick={() => setCreating(true)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2" aria-label="Note folders">
        <FolderRow
          icon={<Files className="h-4 w-4" />}
          label="All notes"
          count={totalCount}
          active={selectedFolderId === null}
          onClick={() => onSelect(null)}
        />
        {folders.map((folder) => {
          if (renamingId === folder.id) {
            return (
              <div key={folder.id} className="px-1 py-0.5">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="h-8 text-sm"
                  aria-label="Folder name"
                />
              </div>
            );
          }
          return (
            <div key={folder.id} className="group relative">
              <FolderRow
                icon={<Folder className="h-4 w-4" />}
                label={folder.name}
                count={counts.get(folder.id) ?? 0}
                active={selectedFolderId === folder.id}
                onClick={() => onSelect(folder.id)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted group-hover:flex focus-visible:flex"
                    aria-label={`Actions for ${folder.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenamingId(folder.id);
                      setRenameValue(folder.name);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-loss focus:text-loss"
                    onClick={() => setPendingDelete(folder)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {creating && (
          <div className="px-1 py-0.5">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={submitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder="Folder name"
              className="h-8 text-sm"
              aria-label="New folder name"
            />
          </div>
        )}
      </nav>

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.name}”?</DialogTitle>
            <DialogDescription>
              Choose what happens to the notes inside this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (pendingDelete) await onDelete(pendingDelete.id, 'keepNotes');
                setPendingDelete(null);
              }}
            >
              Keep notes (move to no folder)
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (pendingDelete) await onDelete(pendingDelete.id, 'deleteNotes');
                setPendingDelete(null);
              }}
            >
              Delete folder and its notes
            </Button>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderRow({
  icon,
  label,
  count,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted'
      )}
      aria-current={active ? 'true' : undefined}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
