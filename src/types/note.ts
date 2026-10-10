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

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  tags: string[];
  linkedTradeIds: string[];
  linkedDates: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

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
