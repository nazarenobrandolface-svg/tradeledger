import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts, usePlaybooks } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface ExecutionRow {
  id: string;
  type: 'entry' | 'exit';
  price: string;
  quantity: string;
  fees: string;
  executedAt: string;
}

export function TradeFormPage() {
  const navigate = useNavigate();
  const accounts = useAccounts();
  const playbooks = usePlaybooks();

  const [accountId, setAccountId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [plannedEntry, setPlannedEntry] = useState('');
  const [plannedStop, setPlannedStop] = useState('');
  const [plannedTarget, setPlannedTarget] = useState('');
  const [playbookId, setPlaybookId] = useState('none');
  const [notes, setNotes] = useState('');
  const [executions, setExecutions] = useState<ExecutionRow[]>([
    {
      id: generateId(),
      type: 'entry',
      price: '',
      quantity: '',
      fees: '0',
      executedAt: new Date().toISOString().slice(0, 16)
    }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addExecution = (type: 'entry' | 'exit') => {
    setExecutions((prev) => [
      ...prev,
      {
        id: generateId(),
        type,
        price: '',
        quantity: '',
        fees: '0',
        executedAt: new Date().toISOString().slice(0, 16)
      }
    ]);
  };

  const updateExecution = (id: string, field: keyof ExecutionRow, value: string) => {
    setExecutions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExecution = (id: string) => {
    setExecutions((prev) => prev.filter((e) => e.id !== id));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!symbol.trim()) errs.symbol = 'Symbol is required';
    if (!accountId) errs.accountId = 'Account is required';

    const entryExecs = executions.filter((e) => e.type === 'entry');

    if (entryExecs.length === 0) {
      errs.executions = 'At least one entry execution is required';
    }

    for (const exec of executions) {
      if (!exec.price || parseFloat(exec.price) <= 0) {
        errs.executions = 'All executions need a valid price';
        break;
      }
      if (!exec.quantity || parseInt(exec.quantity) <= 0) {
        errs.executions = 'All executions need a valid quantity';
        break;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const entryExecs = executions.filter((e) => e.type === 'entry');
    const exitExecs = executions.filter((e) => e.type === 'exit');
    const isClosed = exitExecs.length > 0;

    const firstEntry = entryExecs[0];
    const lastExit = exitExecs[exitExecs.length - 1];

    const tradeId = generateId();

    await repositories.trades.create({
      id: tradeId,
      accountId,
      symbol: symbol.toUpperCase().trim(),
      side,
      status: isClosed ? 'closed' : 'open',
      openedAt: new Date(firstEntry?.executedAt ?? Date.now()).getTime(),
      closedAt: isClosed ? new Date(lastExit?.executedAt ?? Date.now()).getTime() : null,
      plannedEntry: plannedEntry ? parseFloat(plannedEntry) : null,
      plannedStop: plannedStop ? parseFloat(plannedStop) : null,
      plannedTarget: plannedTarget ? parseFloat(plannedTarget) : null,
      playbookId: playbookId === 'none' ? null : playbookId,
      rating: null,
      notes,
      ruleChecklist: {}
    });

    for (const exec of executions) {
      await repositories.executions.create({
        tradeId,
        type: exec.type,
        price: parseFloat(exec.price),
        quantity: parseInt(exec.quantity),
        fees: parseFloat(exec.fees || '0'),
        executedAt: new Date(exec.executedAt).getTime(),
        note: null
      });
    }

    navigate(`/trades/${tradeId}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/trades')}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Trade Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
              />
              {errors.symbol && <p className="text-xs text-loss">{errors.symbol}</p>}
            </div>
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.accountId && <p className="text-xs text-loss">{errors.accountId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Side</Label>
              <Select value={side} onValueChange={(v) => setSide(v as 'long' | 'short')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Playbook</Label>
              <Select value={playbookId} onValueChange={setPlaybookId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {playbooks.map((pb) => (
                    <SelectItem key={pb.id} value={pb.id}>
                      {pb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry">Planned Entry</Label>
              <Input
                id="entry"
                type="number"
                step="0.01"
                value={plannedEntry}
                onChange={(e) => setPlannedEntry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop">Stop Loss</Label>
              <Input
                id="stop"
                type="number"
                step="0.01"
                value={plannedStop}
                onChange={(e) => setPlannedStop(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={plannedTarget}
                onChange={(e) => setPlannedTarget(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Executions</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addExecution('entry')}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
            <Button variant="outline" size="sm" onClick={() => addExecution('exit')}>
              <Plus className="h-4 w-4" />
              Add Exit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.executions && <p className="text-xs text-loss">{errors.executions}</p>}
          {executions.map((exec) => (
            <div key={exec.id} className="flex items-end gap-2 rounded-lg border p-3">
              <div className="w-24">
                <Label className="text-xs">Type</Label>
                <Select
                  value={exec.type}
                  onValueChange={(v) => updateExecution(exec.id, 'type', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="exit">Exit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={exec.price}
                  onChange={(e) => updateExecution(exec.id, 'price', e.target.value)}
                />
              </div>
              <div className="w-24">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={exec.quantity}
                  onChange={(e) => updateExecution(exec.id, 'quantity', e.target.value)}
                />
              </div>
              <div className="w-24">
                <Label className="text-xs">Fees</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={exec.fees}
                  onChange={(e) => updateExecution(exec.id, 'fees', e.target.value)}
                />
              </div>
              <div className="w-44">
                <Label className="text-xs">Time</Label>
                <Input
                  type="datetime-local"
                  value={exec.executedAt}
                  onChange={(e) => updateExecution(exec.id, 'executedAt', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeExecution(exec.id)}
                disabled={executions.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-loss" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Trade notes..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/trades')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save Trade</Button>
      </div>
    </div>
  );
}
