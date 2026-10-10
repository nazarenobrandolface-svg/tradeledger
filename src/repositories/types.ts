import type { Account, Trade, Execution, TradeWithExecutions, TradeFilters } from '@/types/trade';
import type { Tag } from '@/types/tag';
import type { Playbook } from '@/types/playbook';
import type { DayNote, Note, Attachment } from '@/types/note';
import type { ImportTemplate, AppSettings } from '@/types/settings';

export interface AccountRepository {
  getAll(): Promise<Account[]>;
  getById(id: string): Promise<Account | undefined>;
  getDefault(): Promise<Account | undefined>;
  create(account: Omit<Account, 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, changes: Partial<Account>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TradeRepository {
  getAll(): Promise<Trade[]>;
  getById(id: string): Promise<Trade | undefined>;
  getWithExecutions(id: string): Promise<TradeWithExecutions | undefined>;
  getManyWithExecutions(filters?: TradeFilters): Promise<TradeWithExecutions[]>;
  getByAccount(accountId: string): Promise<Trade[]>;
  getByDateRange(from: number, to: number): Promise<Trade[]>;
  getOpen(): Promise<Trade[]>;
  create(trade: Omit<Trade, 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, changes: Partial<Trade>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
}

export interface ExecutionRepository {
  getByTradeId(tradeId: string): Promise<Execution[]>;
  create(execution: Omit<Execution, 'id'>): Promise<string>;
  update(id: string, changes: Partial<Execution>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TagRepository {
  getAll(): Promise<Tag[]>;
  getByCategory(category: string): Promise<Tag[]>;
  create(tag: Omit<Tag, 'createdAt'>): Promise<string>;
  update(id: string, changes: Partial<Tag>): Promise<void>;
  delete(id: string): Promise<void>;
  getTagsForTrade(tradeId: string): Promise<Tag[]>;
  addTagToTrade(tradeId: string, tagId: string): Promise<void>;
  removeTagFromTrade(tradeId: string, tagId: string): Promise<void>;
}

export interface PlaybookRepository {
  getAll(): Promise<Playbook[]>;
  getById(id: string): Promise<Playbook | undefined>;
  create(playbook: Omit<Playbook, 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, changes: Partial<Playbook>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface NoteRepository {
  getDayNotes(): Promise<DayNote[]>;
  getDayNote(accountId: string, date: string): Promise<DayNote | undefined>;
  upsertDayNote(note: Omit<DayNote, 'createdAt' | 'updatedAt'>): Promise<void>;
  getNotes(): Promise<Note[]>;
  getNoteById(id: string): Promise<Note | undefined>;
  createNote(note: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<string>;
  updateNote(id: string, changes: Partial<Note>): Promise<void>;
  deleteNote(id: string): Promise<void>;
}

export interface AttachmentRepository {
  getByTradeId(tradeId: string): Promise<Attachment[]>;
  getByNoteId(noteId: string): Promise<Attachment[]>;
  create(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<string>;
  delete(id: string): Promise<void>;
}

export interface ImportTemplateRepository {
  getAll(): Promise<ImportTemplate[]>;
  getById(id: string): Promise<ImportTemplate | undefined>;
  create(template: Omit<ImportTemplate, 'id' | 'createdAt'>): Promise<string>;
  update(id: string, changes: Partial<ImportTemplate>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(changes: Partial<AppSettings>): Promise<void>;
}

export interface Repositories {
  accounts: AccountRepository;
  trades: TradeRepository;
  executions: ExecutionRepository;
  tags: TagRepository;
  playbooks: PlaybookRepository;
  notes: NoteRepository;
  attachments: AttachmentRepository;
  importTemplates: ImportTemplateRepository;
  settings: SettingsRepository;
}
