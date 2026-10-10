import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { repositories } from '@/repositories';
import {
  calcNetPnl,
  calcTradeOutcome,
  calcRMultiple,
  calcPlannedR,
  calcAvgEntryPrice,
  calcAvgExitPrice,
  calcTotalQuantity,
  calcTotalFees,
  calcHoldTime
} from '@/lib/metrics';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { TagBadge } from '@/components/shared/TagBadge';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTags, usePlaybooks } from '@/hooks/useRepositories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trade = useLiveQuery(() => repositories.trades.getWithExecutions(id ?? ''), [id]);
  const tags = useTags();
  const playbooks = usePlaybooks();
  const tradeTags = useLiveQuery(
    () => (id ? repositories.tags.getTagsForTrade(id) : Promise.resolve([])),
    [id]
  );

  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [playbookId, setPlaybookId] = useState<string | null>(null);

  useEffect(() => {
    if (trade) {
      setNotes(trade.notes);
      setRating(trade.rating);
      setPlaybookId(trade.playbookId);
    }
  }, [trade]);

  if (!trade) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const pnl = calcNetPnl(trade.executions, trade.side);
  const outcome = calcTradeOutcome(trade.executions);
  const r = calcRMultiple(trade, trade.executions);
  const plannedR = calcPlannedR(trade, trade.executions);
  const qty = calcTotalQuantity(trade.executions);
  const entry = calcAvgEntryPrice(trade.executions);
  const exit = calcAvgExitPrice(trade.executions);
  const fees = calcTotalFees(trade.executions);
  const holdTime = calcHoldTime(trade.openedAt, trade.closedAt);

  const handleSave = async () => {
    await repositories.trades.update(trade.id, {
      notes,
      rating,
      playbookId
    });
  };

  const handleAddTag = async (tagId: string) => {
    await repositories.tags.addTagToTrade(trade.id, tagId);
  };

  const handleRemoveTag = async (tagId: string) => {
    await repositories.tags.removeTagFromTrade(trade.id, tagId);
  };

  const handleDelete = async () => {
    if (confirm('Delete this trade?')) {
      await repositories.trades.delete(trade.id);
      navigate('/trades');
    }
  };

  const unselectedTags = tags.filter((t) => !tradeTags?.some((tt) => tt.id === t.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/trades')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Trades
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">{trade.symbol}</CardTitle>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className={trade.side === 'long' ? 'text-profit' : 'text-loss'}>
                  {trade.side === 'long' ? 'LONG' : 'SHORT'}
                </span>
                <span>·</span>
                <span>
                  {trade.status === 'open' ? 'Open' : outcome}
                </span>
              </div>
            </div>
            <div className="text-right">
              <PnLDisplay value={pnl} size="xl" />
              {r !== null && (
                <div className={`text-sm font-medium ${r >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {r.toFixed(2)}R
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Opened</div>
                <div className="text-sm font-medium">
                  {format(trade.openedAt, 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Closed</div>
                <div className="text-sm font-medium">
                  {trade.closedAt ? format(trade.closedAt, 'MMM d, yyyy HH:mm') : 'Open'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hold Time</div>
                <div className="text-sm font-medium">{holdTime ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fees</div>
                <div className="text-sm font-medium">${fees.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Entry</div>
                <div className="text-sm font-medium">${entry.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Exit</div>
                <div className="text-sm font-medium">
                  {exit > 0 ? `$${exit.toFixed(2)}` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Quantity</div>
                <div className="text-sm font-medium">{qty}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Planned R</div>
                <div className="text-sm font-medium">
                  {plannedR !== null ? `${plannedR.toFixed(2)}R` : '—'}
                </div>
              </div>
            </div>

            {trade.plannedStop && (
              <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Planned Entry</div>
                  <div className="font-medium">${trade.plannedEntry?.toFixed(2) ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stop Loss</div>
                  <div className="font-medium text-loss">${trade.plannedStop.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="font-medium text-profit">
                    ${trade.plannedTarget?.toFixed(2) ?? '—'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trade.executions
                .sort((a, b) => a.executedAt - b.executedAt)
                .map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <div>
                      <span
                        className={`font-medium ${exec.type === 'entry' ? 'text-profit' : 'text-loss'}`}
                      >
                        {exec.type === 'entry' ? 'BUY' : 'SELL'}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {exec.quantity} @ ${exec.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {format(exec.executedAt, 'HH:mm:ss')}
                      <div>${exec.fees.toFixed(2)} fees</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tradeTags?.map((tag) => (
                <TagBadge key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
              ))}
              {(!tradeTags || tradeTags.length === 0) && (
                <span className="text-sm text-muted-foreground">No tags</span>
              )}
            </div>
            {unselectedTags.length > 0 && (
              <Select onValueChange={handleAddTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Add a tag..." />
                </SelectTrigger>
                <SelectContent>
                  {unselectedTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rating & Playbook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Rating (1-5)</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setRating(n === rating ? null : n);
                      repositories.trades.update(trade.id, {
                        rating: n === rating ? null : n
                      });
                    }}
                    className={`h-8 w-8 rounded-lg border text-sm font-medium transition-colors ${
                      (rating ?? 0) >= n
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Playbook</div>
              <Select
                value={playbookId ?? 'none'}
                onValueChange={(v) => {
                  const id = v === 'none' ? null : v;
                  setPlaybookId(id);
                  repositories.trades.update(trade.id, { playbookId: id });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select playbook" />
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your trade notes..."
            className="min-h-[120px]"
          />
          <Button className="mt-3" onClick={handleSave}>
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
