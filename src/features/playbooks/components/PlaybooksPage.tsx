import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaybooks, useTradesWithExecutions } from '@/hooks/useRepositories';
import { repositories } from '@/repositories';
import { generateId } from '@/lib/utils';
import { calcNetPnl, calcTradeOutcome, calcExpectancy } from '@/lib/metrics';
import { formatPercent } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { Plus, CandlestickChart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { useFilterStore } from '@/stores/filterStore';

export function PlaybooksPage() {
  const navigate = useNavigate();
  const playbooks = usePlaybooks();
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6C5CE7');

  const playbookStats = useMemo(() => {
    if (!trades || !playbooks) return new Map();
    const map = new Map<string, { count: number; pnl: number; wins: number; losses: number; pnls: number[] }>();
    for (const pb of playbooks) {
      map.set(pb.id, { count: 0, pnl: 0, wins: 0, losses: 0, pnls: [] });
    }
    for (const t of trades) {
      if (!t.playbookId || t.status !== 'closed') continue;
      const stats = map.get(t.playbookId);
      if (!stats) continue;
      const pnl = calcNetPnl(t.executions, t.side);
      stats.count++;
      stats.pnl += pnl;
      stats.pnls.push(pnl);
      const outcome = calcTradeOutcome(t.executions);
      if (outcome === 'win') stats.wins++;
      if (outcome === 'loss') stats.losses++;
    }
    return map;
  }, [trades, playbooks]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const id = await repositories.playbooks.create({
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      color,
      rules: []
    });
    setName('');
    setDescription('');
    setOpen(false);
    navigate(`/playbooks/${id}`);
  };

  if (!playbooks || playbooks.length === 0) {
    return (
      <EmptyState
        icon={<CandlestickChart className="h-12 w-12" />}
        title="No playbooks yet"
        description="Create a playbook to track your trading strategies and their performance."
        action={{ label: 'Create Playbook', onClick: () => setOpen(true) }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Playbook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Playbook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Momentum Breakout" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your strategy..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-md border"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playbooks.map((pb) => {
          const stats = playbookStats.get(pb.id);
          return (
            <Card
              key={pb.id}
              className="cursor-pointer transition-shadow hover:shadow-card-hover"
              onClick={() => navigate(`/playbooks/${pb.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: pb.color }}
                  />
                  <CardTitle className="text-base">{pb.name}</CardTitle>
                </div>
                {pb.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{pb.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Trades</div>
                    <div className="font-semibold">{stats?.count ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                    <div className="font-semibold">
                      {stats && stats.count > 0 ? formatPercent(stats.wins / stats.count) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Net P&L</div>
                    {stats ? (
                      <PnLDisplay value={stats.pnl} size="sm" />
                    ) : (
                      <span className="font-semibold">—</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Expectancy</div>
                    {stats && stats.pnls.length > 0 ? (
                      <span className="font-semibold">
                        ${calcExpectancy(stats.pnls).toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-semibold">—</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
