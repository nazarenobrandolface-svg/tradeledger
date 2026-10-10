import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calcNetPnl, calcTradeOutcome } from '@/lib/metrics';
import type { DailyStats } from '@/lib/metrics';
import type { TradeWithExecutions } from '@/types/trade';
import { useNavigate } from 'react-router-dom';
import { repositories } from '@/repositories';
import { useSettings } from '@/hooks/useRepositories';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface JournalDayCardProps {
  day: {
    date: string;
    dateObj: Date;
    trades: TradeWithExecutions[];
    stats: DailyStats;
  };
  currency?: string;
}

export function JournalDayCard({ day, currency = 'USD' }: JournalDayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const sparklineData = day.trades
    .filter((t) => t.closedAt)
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0))
    .map((t) => ({ time: t.closedAt!, value: calcNetPnl(t.executions, t.side) }));

  let cumulative = 0;
  const cumulativeData = sparklineData.map((d) => {
    cumulative += d.value;
    return { time: d.time, value: cumulative };
  });

  return (
    <Card>
      <CardHeader
        className="cursor-pointer py-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <div className="font-semibold">{format(day.dateObj, 'EEEE, MMMM d, yyyy')}</div>
              <div className="text-xs text-muted-foreground">
                {day.stats.tradeCount} trades · {day.stats.winners}W / {day.stats.losers}L
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden w-32 sm:block">
              {cumulativeData.length > 1 && (
                <MiniSparkline
                  data={cumulativeData}
                  height={32}
                  color={day.stats.netPnl >= 0 ? '#16C784' : '#EA3943'}
                />
              )}
            </div>
            <PnLDisplay value={day.stats.netPnl} currency={currency} size="lg" />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t pt-4">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Trades</div>
              <div className="text-lg font-semibold">{day.stats.tradeCount}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Winners</div>
              <div className="text-lg font-semibold text-profit">{day.stats.winners}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Losers</div>
              <div className="text-lg font-semibold text-loss">{day.stats.losers}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Gross P&L</div>
              <div className={cn('text-lg font-semibold', day.stats.grossPnl >= 0 ? 'text-profit' : 'text-loss')}>
                ${Math.abs(day.stats.grossPnl).toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Commissions</div>
              <div className="text-lg font-semibold">${day.stats.commissions.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="text-lg font-semibold">{day.stats.volume}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Profit Factor</div>
              <div className="text-lg font-semibold">
                {day.stats.profitFactor === Infinity ? '∞' : day.stats.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium">Trades</h4>
            <div className="space-y-1">
              {day.trades.map((trade) => {
                const pnl = calcNetPnl(trade.executions, trade.side);
                const outcome = calcTradeOutcome(trade.executions);
                return (
                  <div
                    key={trade.id}
                    onClick={() => navigate(`/trades/${trade.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{trade.symbol}</span>
                      <span className={trade.side === 'long' ? 'text-profit' : 'text-loss'}>
                        {trade.side === 'long' ? 'LONG' : 'SHORT'}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        outcome === 'win' ? 'bg-profit/10 text-profit' : outcome === 'loss' ? 'bg-loss/10 text-loss' : 'bg-muted text-muted-foreground'
                      )}>
                        {outcome}
                      </span>
                    </div>
                    <PnLDisplay value={pnl} currency={currency} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>

          <DayNoteEditor date={day.date} />
        </CardContent>
      )}
    </Card>
  );
}

function DayNoteEditor({ date }: { date: string }) {
  const settings = useSettings();
  const [tab, setTab] = useState('post');
  const [preMarket, setPreMarket] = useState('');
  const [postMarket, setPostMarket] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);

  const accountId = settings?.defaultAccountId ?? '';

  useState(() => {
    repositories.notes.getDayNote(accountId, date).then((note) => {
      if (note) {
        setPreMarket(note.preMarketPlan);
        setPostMarket(note.postMarketReview);
      }
      setLoaded(true);
    });
  });

  const handleSave = async () => {
    if (!accountId) return;
    await repositories.notes.upsertDayNote({
      id: `${accountId}_${date}`,
      accountId,
      date,
      preMarketPlan: preMarket,
      postMarketReview: postMarket,
      mood: null
    });
    setDirty(false);
  };

  if (!loaded) return <div className="skeleton h-32" />;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium">Day Notes</h4>
        {dirty && (
          <Button size="sm" onClick={handleSave}>
            Save Notes
          </Button>
        )}
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pre">Pre-Market Plan</TabsTrigger>
          <TabsTrigger value="post">Post-Market Review</TabsTrigger>
        </TabsList>
        <TabsContent value="pre">
          <Textarea
            value={preMarket}
            onChange={(e) => {
              setPreMarket(e.target.value);
              setDirty(true);
            }}
            placeholder="What was your plan for today?"
            className="min-h-[100px]"
          />
        </TabsContent>
        <TabsContent value="post">
          <Textarea
            value={postMarket}
            onChange={(e) => {
              setPostMarket(e.target.value);
              setDirty(true);
            }}
            placeholder="How did the day go? What did you learn?"
            className="min-h-[100px]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
