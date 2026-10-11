import { useState } from 'react';
import { useAccounts, useTags } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { db } from '@/db/database';
import { generateId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/appStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Trash2, Download, Upload, Sun, Moon, Monitor } from 'lucide-react';
import type { Note, NoteFolder, DayNote } from '@/types/note';
import { ACCOUNT_TYPE_LABELS, clampLeverage, type AccountType } from '@/types/trade';
import type { Account, Trade, Execution } from '@/types/trade';
import type { Tag, TradeTag } from '@/types/tag';
import { AccountSetupFields } from '@/components/shared/AccountSetupFields';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

type PendingAction =
  | { kind: 'account'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'import'; data: Record<string, unknown> }
  | { kind: 'clear' }
  | { kind: 'reseed' }
  | null;

export function SettingsPage() {
  const accounts = useAccounts();
  const tags = useTags();
  const { theme, setTheme } = useAppStore();

  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('demo');
  const [accountBalance, setAccountBalance] = useState('50000');
  const [accountLeverage, setAccountLeverage] = useState(100);
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [commissionPerTrade, setCommissionPerTrade] = useState('0');
  const [commissionPerShare, setCommissionPerShare] = useState('0.005');

  const [tagName, setTagName] = useState('');
  const [tagCategory, setTagCategory] = useState('custom');
  const [tagColor, setTagColor] = useState('#6C5CE7');

  const [pending, setPending] = useState<PendingAction>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleSetTheme = (next: 'light' | 'dark' | 'system') => {
    setTheme(next);
    void repositories.settings.update({ theme: next });
  };

  const handleAddAccount = async () => {
    if (!accountName.trim()) return;
    await repositories.accounts.create({
      id: generateId(),
      name: accountName.trim(),
      currency: accountCurrency,
      startingBalance: parseFloat(accountBalance) || 0,
      type: accountType,
      leverage: clampLeverage(accountLeverage),
      timezone: 'America/New_York',
      commissionPerTrade: parseFloat(commissionPerTrade) || 0,
      commissionPerShare: parseFloat(commissionPerShare) || 0,
      isDefault: accounts.length === 0
    });
    setAccountName('');
  };

  const handleDeleteAccount = (id: string) => {
    setPending({ kind: 'account', id });
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) return;
    await repositories.tags.create({
      id: generateId(),
      name: tagName.trim(),
      color: tagColor,
      category: tagCategory as 'setup' | 'mistake' | 'emotion' | 'custom'
    });
    setTagName('');
  };

  const handleDeleteTag = (id: string) => {
    setPending({ kind: 'tag', id });
  };

  const handleExport = async () => {
    const data = {
      accounts: await db.accounts.toArray(),
      trades: await db.trades.toArray(),
      executions: await db.executions.toArray(),
      tags: await db.tags.toArray(),
      tradeTags: await db.tradeTags.toArray(),
      dayNotes: await db.dayNotes.toArray(),
      noteFolders: await db.noteFolders.toArray(),
      notes: await db.notes.toArray(),
      importTemplates: await db.importTemplates.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setStatus(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setPending({ kind: 'import', data });
      } catch {
        setStatus('That file is not a valid backup.');
      }
    };
    input.click();
  };

  const runImport = async (data: Record<string, unknown>) => {
    // Older backups contain a `playbooks` key and playbookId/ruleChecklist on
    // trades. Those fields no longer exist, so strip them and skip the key
    // rather than crashing or reintroducing removed data.
    const sanitizeTrade = (trade: Record<string, unknown>) => {
      const copy = { ...trade };
      delete copy.playbookId;
      delete copy.ruleChecklist;
      return copy;
    };
    const trades = ((data.trades ?? []) as unknown as Record<string, unknown>[]).map(sanitizeTrade);

    // v3 schema: notes reference folders by id. Older backups stored the
    // folder *name* directly on the note and had no noteFolders table, so
    // rebuild the folders from those names and re-point the notes.
    const sanitizeNote = (note: Record<string, unknown>, folderIdByName: Map<string, string>) => {
      const copy = { ...note };
      if (typeof copy.folderId !== 'string') {
        const name = typeof copy.folder === 'string' ? copy.folder : null;
        copy.folderId = name ? (folderIdByName.get(name) ?? null) : null;
      }
      delete copy.folder;
      return copy;
    };

    const folders: NoteFolder[] = [...(Array.isArray(data.noteFolders) ? data.noteFolders : [])];
    const folderIdByName = new Map<string, string>(
      folders
        .filter((f) => typeof f.name === 'string' && typeof f.id === 'string')
        .map((f) => [f.name, f.id] as [string, string])
    );
    // Create folders referenced only by legacy notes (name stored on note).
    const rawNotes = (data.notes ?? []) as unknown as Record<string, unknown>[];
    for (const note of rawNotes) {
      const name = typeof note.folder === 'string' ? note.folder : null;
      if (name && !folderIdByName.has(name)) {
        const id = crypto.randomUUID();
        folderIdByName.set(name, id);
        folders.push({ id, name, createdAt: Date.now() });
      }
    }
    const knownFolderIds = new Set(folders.map((f) => String(f.id)));
    const notes = rawNotes.map((n) => sanitizeNote(n, folderIdByName)) as unknown as Note[];
    for (const note of notes) {
      if (note.folderId && !knownFolderIds.has(String(note.folderId))) {
        note.folderId = null;
      }
    }

    await db.transaction(
      'rw',
      [
        db.accounts,
        db.trades,
        db.executions,
        db.tags,
        db.tradeTags,
        db.dayNotes,
        db.noteFolders,
        db.notes
      ],
      async () => {
        // A restore *replaces* the current data — clear first so records that
        // are absent from the backup don't linger alongside the import.
        await Promise.all([
          db.accounts.clear(),
          db.trades.clear(),
          db.executions.clear(),
          db.tags.clear(),
          db.tradeTags.clear(),
          db.dayNotes.clear(),
          db.noteFolders.clear(),
          db.notes.clear()
        ]);
        await db.accounts.bulkPut((data.accounts ?? []) as unknown as Account[]);
        await db.trades.bulkPut(trades as unknown as Trade[]);
        await db.executions.bulkPut((data.executions ?? []) as unknown as Execution[]);
        await db.tags.bulkPut((data.tags ?? []) as unknown as Tag[]);
        await db.tradeTags.bulkPut((data.tradeTags ?? []) as unknown as TradeTag[]);
        await db.dayNotes.bulkPut((data.dayNotes ?? []) as unknown as DayNote[]);
        await db.noteFolders.bulkPut(folders);
        await db.notes.bulkPut(notes);
      }
    );
    setStatus('Import complete.');
  };

  const handleClearData = () => setPending({ kind: 'clear' });

  const handleReseed = () => setPending({ kind: 'reseed' });

  const confirmPending = async () => {
    if (!pending) return;
    switch (pending.kind) {
      case 'account':
        await repositories.accounts.delete(pending.id);
        break;
      case 'tag':
        await repositories.tags.delete(pending.id);
        break;
      case 'import':
        await runImport(pending.data);
        break;
      case 'clear':
        await db.delete();
        window.location.reload();
        return;
      case 'reseed':
        // Wipe and reload: App's first-run check sees an empty database and
        // seeds a fresh demo dataset. Calling seed() directly would append a
        // second copy of the demo trades on top of the existing ones.
        await db.delete();
        window.location.reload();
        return;
    }
    setPending(null);
  };

  const pendingDialog = (() => {
    switch (pending?.kind) {
      case 'account':
        return {
          title: 'Delete this account?',
          description: 'All trades in this account will be removed. This cannot be undone.',
          confirmLabel: 'Delete account'
        };
      case 'tag':
        return {
          title: 'Delete this tag?',
          description: 'The tag will be removed from all trades. This cannot be undone.',
          confirmLabel: 'Delete tag'
        };
      case 'import':
        return {
          title: 'Replace all existing data?',
          description:
            'Importing this backup replaces your current trades, notes, tags and accounts. This cannot be undone.',
          confirmLabel: 'Import backup'
        };
      case 'clear':
        return {
          title: 'Delete ALL data?',
          description:
            'Every trade, note, account and setting will be permanently deleted. This cannot be undone.',
          confirmLabel: 'Delete everything'
        };
      case 'reseed':
        return {
          title: 'Replace data with demo data?',
          description:
            'Your current trades, notes and tags will be replaced with ~300 demo trades. This cannot be undone.',
          confirmLabel: 'Re-seed demo data'
        };
      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Tabs defaultValue="accounts">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Trading Accounts</CardTitle>
              <CardDescription>Manage your trading accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.currency} · Starting: ${account.startingBalance.toLocaleString()} ·{' '}
                      {ACCOUNT_TYPE_LABELS[account.type ?? 'demo']} · 1:{account.leverage ?? 100}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.isDefault && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        Default
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-loss" />
                    </Button>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={accountCurrency} onValueChange={setAccountCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4 sm:col-span-2">
                  <AccountSetupFields
                    idPrefix="settings-account"
                    type={accountType}
                    onTypeChange={setAccountType}
                    size={accountBalance}
                    onSizeChange={setAccountBalance}
                    leverage={accountLeverage}
                    onLeverageChange={setAccountLeverage}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission per Trade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={commissionPerTrade}
                    onChange={(e) => setCommissionPerTrade(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission per Share</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={commissionPerShare}
                    onChange={(e) => setCommissionPerShare(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAddAccount}>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSetTheme('light')}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSetTheme('dark')}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSetTheme('system')}
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Tag Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-muted-foreground hover:text-loss"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Tag Name</Label>
                  <Input value={tagName} onChange={(e) => setTagName(e.target.value)} />
                </div>
                <Select value={tagCategory} onValueChange={setTagCategory}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setup">Setup</SelectItem>
                    <SelectItem value="mistake">Mistake</SelectItem>
                    <SelectItem value="emotion">Emotion</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border"
                />
                <Button onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>Export or import your complete trading data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export Backup
                </Button>
                <Button variant="outline" onClick={handleImport}>
                  <Upload className="h-4 w-4" />
                  Import Backup
                </Button>
              </div>
              {status && (
                <p role="status" className="text-sm text-profit">
                  {status}
                </p>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Demo Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate ~300 realistic trades over 6 months
                  </p>
                  <Button variant="outline" className="mt-2" onClick={handleReseed}>
                    Re-seed Demo Data
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-loss">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete all data. This cannot be undone.
                  </p>
                  <Button variant="destructive" className="mt-2" onClick={handleClearData}>
                    <Trash2 className="h-4 w-4" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pending && pendingDialog && (
        <ConfirmDialog
          open
          title={pendingDialog.title}
          description={pendingDialog.description}
          confirmLabel={pendingDialog.confirmLabel}
          destructive={pending.kind !== 'import' && pending.kind !== 'reseed'}
          onConfirm={() => void confirmPending()}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
