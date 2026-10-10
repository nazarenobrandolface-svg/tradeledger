import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTradesWithExecutions } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { calcNetPnl, calcTradeOutcome, calcExpectancy } from '@/lib/metrics';
import { formatPercent } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFilterStore } from '@/stores/filterStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function PlaybookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playbook = useLiveQuery(() => repositories.playbooks.getById(id ?? ''), [id]);
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined,
    playbookId: id
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newRuleType, setNewRuleType] = useState<'entry' | 'exit' | 'risk'>('entry');

  useEffect(() => {
    if (playbook) {
      setName(playbook.name);
      setDescription(playbook.description);
    }
  }, [playbook]);

  if (!playbook) return <div className="skeleton h-64" />;

  const closedTrades = trades?.filter((t) => t.status === 'closed') ?? [];
  const pnls = closedTrades.map((t) => calcNetPnl(t.executions, t.side));
  const wins = closedTrades.filter((t) => calcTradeOutcome(t.executions) === 'win').length;
  const totalPnl = pnls.reduce((s, p) => s + p, 0);
  const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;
  const expectancy = calcExpectancy(pnls);

  const rulesFollowedRate = (() => {
    if (playbook.rules.length === 0 || closedTrades.length === 0) return 0;
    let totalChecked = 0;
    let totalRules = 0;
    for (const t of closedTrades) {
      const checked = Object.values(t.ruleChecklist).filter(Boolean).length;
      totalChecked += checked;
      totalRules += playbook.rules.length;
    }
    return totalRules > 0 ? totalChecked / totalRules : 0;
  })();

  const handleSave = async () => {
    await repositories.playbooks.update(playbook.id, { name, description });
  };

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    const rules = [
      ...playbook.rules,
      { id: generateId(), label: newRule.trim(), type: newRuleType }
    ];
    await repositories.playbooks.update(playbook.id, { rules });
    setNewRule('');
  };

  const handleRemoveRule = async (ruleId: string) => {
    const rules = playbook.rules.filter((r) => r.id !== ruleId);
    await repositories.playbooks.update(playbook.id, { rules });
  };

  const handleDelete = async () => {
    if (confirm('Delete this playbook?')) {
      await repositories.playbooks.delete(playbook.id);
      navigate('/playbooks');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/playbooks')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleSave}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="text-2xl font-bold">{closedTrades.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{formatPercent(winRate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Net P&L</div>
              <PnLDisplay value={totalPnl} size="xl" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expectancy</div>
              <div className="text-lg font-bold">${expectancy.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rules Followed</div>
              <div className="text-lg font-bold">{formatPercent(rulesFollowedRate)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry/Exit Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {playbook.rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      rule.type === 'entry'
                        ? 'bg-profit/10 text-profit'
                        : rule.type === 'exit'
                          ? 'bg-loss/10 text-loss'
                          : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {rule.type}
                  </span>
                  <span className="text-sm">{rule.label}</span>
                </div>
                <button
                  onClick={() => handleRemoveRule(rule.id)}
                  className="text-muted-foreground hover:text-loss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {playbook.rules.length === 0 && (
              <p className="text-sm text-muted-foreground">No rules defined yet.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Add a rule..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
            />
            <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as 'entry' | 'exit' | 'risk')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="exit">Exit</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddRule}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trades Using This Playbook</CardTitle>
        </CardHeader>
        <CardContent>
          {closedTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trades yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Net P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedTrades.slice(0, 10).map((trade) => {
                  const pnl = calcNetPnl(trade.executions, trade.side);
                  const outcome = calcTradeOutcome(trade.executions);
                  return (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
                      <TableCell className="font-semibold">{trade.symbol}</TableCell>
                      <TableCell className={trade.side === 'long' ? 'text-profit' : 'text-loss'}>
                        {trade.side.toUpperCase()}
                      </TableCell>
                      <TableCell>{outcome}</TableCell>
                      <TableCell>
                        <PnLDisplay value={pnl} size="sm" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
