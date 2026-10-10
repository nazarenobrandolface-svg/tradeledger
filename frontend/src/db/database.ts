import Dexie, { type Table } from 'dexie';
import type { Account, Trade, Execution } from '@/types/trade';
import type { Tag, TradeTag } from '@/types/tag';
import type { DayNote, Note, NoteFolder, Attachment } from '@/types/note';
import type { ImportTemplate, AppSettings } from '@/types/settings';

export class TradeLedgerDB extends Dexie {
  accounts!: Table<Account, string>;
  trades!: Table<Trade, string>;
  executions!: Table<Execution, string>;
  tags!: Table<Tag, string>;
  tradeTags!: Table<TradeTag, [string, string]>;
  noteFolders!: Table<NoteFolder, string>;
  dayNotes!: Table<DayNote, string>;
  notes!: Table<Note, string>;
  attachments!: Table<Attachment, string>;
  importTemplates!: Table<ImportTemplate, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('tradeledger');

    // v1: initial schema (includes the playbooks feature, now removed)
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

    // v2: playbooks feature removed. Drops the playbooks table and the
    // playbookId index, and strips playbookId/ruleChecklist from existing
    // trade records so no stale data lingers.
    this.version(2)
      .stores({
        accounts: 'id, name, isDefault',
        trades: 'id, accountId, symbol, status, openedAt, closedAt',
        executions: 'id, tradeId, executedAt',
        tags: 'id, name, category',
        tradeTags: '[tradeId+tagId], tradeId, tagId',
        playbooks: null,
        playbookRules: null,
        dayNotes: 'id, [accountId+date], date',
        notes: 'id, title, folder, pinned, createdAt',
        attachments: 'id, tradeId, noteId, dayNoteId',
        importTemplates: 'id, name, broker',
        settings: 'key'
      })
      .upgrade((tx) =>
        tx
          .table('trades')
          .toCollection()
          .modify((trade) => {
            const record = trade as unknown as Record<string, unknown>;
            delete record.playbookId;
            delete record.ruleChecklist;
          })
      );

    // v3: first-class note folders. Adds the noteFolders table and switches
    // notes from a folder *name* string to a folderId reference so folders can
    // be renamed without breaking the notes inside them. Existing folder names
    // are turned into noteFolders rows.
    this.version(3)
      .stores({
        accounts: 'id, name, isDefault',
        trades: 'id, accountId, symbol, status, openedAt, closedAt',
        executions: 'id, tradeId, executedAt',
        tags: 'id, name, category',
        tradeTags: '[tradeId+tagId], tradeId, tagId',
        noteFolders: 'id, name',
        dayNotes: 'id, [accountId+date], date',
        notes: 'id, title, folderId, pinned, createdAt, updatedAt',
        attachments: 'id, tradeId, noteId, dayNoteId',
        importTemplates: 'id, name, broker',
        settings: 'key'
      })
      .upgrade(async (tx) => {
        const notesTable = tx.table('notes');
        const foldersTable = tx.table('noteFolders');
        const notes = await notesTable.toArray();
        const existingFolders = await foldersTable.toArray();
        const idByName = new Map<string, string>(
          existingFolders.map((f: { id: string; name: string }) => [f.name, f.id])
        );

        for (const note of notes as Array<Record<string, unknown>>) {
          const folderName = typeof note.folder === 'string' ? note.folder : null;
          if (folderName) {
            let folderId = idByName.get(folderName);
            if (!folderId) {
              folderId = crypto.randomUUID();
              idByName.set(folderName, folderId);
              await foldersTable.put({
                id: folderId,
                name: folderName,
                createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now()
              });
            }
            note.folderId = folderId;
          } else {
            note.folderId = null;
          }
          delete note.folder;
          await notesTable.put(note);
        }
      });
    // v4: trade asset-class category (forex / indices / futures / stocks).
    // Existing rows simply have no category; the index is built automatically.
    this.version(4).stores({
      accounts: 'id, name, isDefault',
      trades: 'id, accountId, symbol, status, openedAt, closedAt, category',
      executions: 'id, tradeId, executedAt',
      tags: 'id, name, category',
      tradeTags: '[tradeId+tagId], tradeId, tagId',
      noteFolders: 'id, name',
      dayNotes: 'id, [accountId+date], date',
      notes: 'id, title, folderId, pinned, createdAt, updatedAt',
      attachments: 'id, tradeId, noteId, dayNoteId',
      importTemplates: 'id, name, broker',
      settings: 'key'
    });
  }
}

export const db = new TradeLedgerDB();
