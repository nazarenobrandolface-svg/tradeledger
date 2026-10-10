import { useState, useEffect } from 'react';
import { useAccounts, useTags, useSettings } from '@/hooks/useRepositories';
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
import { seed } from '@/db/seed';

export function SettingsPage() {
  const accounts = useAccounts();
  const tags = useTags();
  const settings = useSettings();
  const { theme, setTheme } = useAppStore();

  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('50000');
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [commissionPerTrade, setCommissionPerTrade] = useState('0');
  const [commissionPerShare, setCommissionPerShare] = useState('0.005');

  const [tagName, setTagName] = useState('');
  const [tagCategory, setTagCategory] = useState('custom');
  const [tagColor, setTagColor] = useState('#6C5CE7');

  useEffect(() => {
    if (settings) {
      useAppStore.getState().setTheme(settings.theme);
    }
  }, [settings]);

  const handleAddAccount = async () => {
    if (!accountName.trim()) return;
    await repositories.accounts.create({
      id: generateId(),
      name: accountName.trim(),
      currency: accountCurrency,
      startingBalance: parseFloat(accountBalance) || 0,
      timezone: 'America/New_York',
      commissionPerTrade: parseFloat(commissionPerTrade) || 0,
      commissionPerShare: parseFloat(commissionPerShare) || 0,
      isDefault: accounts.length === 0
    });
    setAccountName('');
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Delete this account? All trades will be removed.')) {
      await repositories.accounts.delete(id);
    }
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

  const handleDeleteTag = async (id: string) => {
    if (confirm('Delete this tag?')) {
      await repositories.tags.delete(id);
    }
  };

  const handleExport = async () => {
    const data = {
      accounts: await db.accounts.toArray(),
      trades: await db.trades.toArray(),
      executions: await db.executions.toArray(),
      tags: await db.tags.toArray(),
      tradeTags: await db.tradeTags.toArray(),
      playbooks: await db.playbooks.toArray(),
      dayNotes: await db.dayNotes.toArray(),
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (confirm('This will replace all existing data. Continue?')) {
        await db.transaction('rw', [db.accounts, db.trades, db.executions, db.tags, db.tradeTags, db.playbooks, db.dayNotes, db.notes], async () => {
          await db.accounts.bulkPut(data.accounts ?? []);
          await db.trades.bulkPut(data.trades ?? []);
          await db.executions.bulkPut(data.executions ?? []);
          await db.tags.bulkPut(data.tags ?? []);
          await db.tradeTags.bulkPut(data.tradeTags ?? []);
          await db.playbooks.bulkPut(data.playbooks ?? []);
          await db.dayNotes.bulkPut(data.dayNotes ?? []);
          await db.notes.bulkPut(data.notes ?? []);
        });
        alert('Import complete!');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm('This will permanently delete ALL data. Are you sure?')) {
      if (confirm('Really sure? This cannot be undone.')) {
        await db.delete();
        window.location.reload();
      }
    }
  };

  const handleReseed = async () => {
    if (confirm('This will replace all data with demo data. Continue?')) {
      await seed();
      window.location.reload();
    }
  };

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
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-semibold">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.currency} · Starting: ${account.startingBalance.toLocaleString()}
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Starting Balance</Label>
                  <Input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value)}
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
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
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

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Tag Name</Label>
                  <Input value={tagName} onChange={(e) => setTagName(e.target.value)} />
                </div>
                <Select value={tagCategory} onValueChange={setTagCategory}>
                  <SelectTrigger className="w-[140px]">
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
              <div className="flex gap-3">
                <Button onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Export Backup
                </Button>
                <Button variant="outline" onClick={handleImport}>
                  <Upload className="h-4 w-4" />
                  Import Backup
                </Button>
              </div>

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
    </div>
  );
}
