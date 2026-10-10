export interface DayNote {
  id: string;
  accountId: string;
  date: string;
  preMarketPlan: string;
  postMarketReview: string;
  mood: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  linkedTradeIds: string[];
  linkedDates: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

/** How to handle notes left inside a folder that is being deleted. */
export type FolderDeleteMode = 'keepNotes' | 'deleteNotes';

export interface Attachment {
  id: string;
  tradeId: string | null;
  noteId: string | null;
  dayNoteId: string | null;
  fileName: string;
  mimeType: string;
  blob: Blob;
  size: number;
  createdAt: number;
}
