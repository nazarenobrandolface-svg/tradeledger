import Dexie, { type Table } from 'dexie';
import type { Account, Trade, Execution } from '@/types/trade';
import type { Tag, TradeTag } from '@/types/tag';
import type { Playbook } from '@/types/playbook';
import type { DayNote, Note, Attachment } from '@/types/note';
import type { ImportTemplate, AppSettings } from '@/types/settings';

export class TradeLedgerDB extends Dexie {
  accounts!: Table<Account, string>;
  trades!: Table<Trade, string>;
  executions!: Table<Execution, string>;
  tags!: Table<Tag, string>;
  tradeTags!: Table<TradeTag, [string, string]>;
  playbooks!: Table<Playbook, string>;
  dayNotes!: Table<DayNote, string>;
  notes!: Table<Note, string>;
  attachments!: Table<Attachment, string>;
  importTemplates!: Table<ImportTemplate, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('tradeledger');
    this.version(1).stores({
      accounts: 'id, name, isDefault',
      trades: 'id, accountId, symbol, status, openedAt, closedAt, playbookId',
      executions: 'id, tradeId, executedAt',
      tags: 'id, name, category',
      tradeTags: '[tradeId+tagId], tradeId, tagId',
      playbooks: 'id, name',
      dayNotes: 'id, [accountId+date], date',
      notes: 'id, title, folder, pinned, createdAt',
      attachments: 'id, tradeId, noteId, dayNoteId',
      importTemplates: 'id, name, broker',
      settings: 'key'
    });
  }
}

export const db = new TradeLedgerDB();
