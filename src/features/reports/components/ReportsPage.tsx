import { useMemo } from 'react';
import { useFilterStore } from '@/stores/filterStore';
import { useTradesWithExecutions, useDefaultAccount } from '@/hooks/useRepositories';
import {
  calcNetPnl,
  calcTradeOutcome,
  calcWinRate,
  calcProfitFactor,
  calcExpectancy,
  calcRMultiple,
  calcAvgHoldTimeMs,
  calcTotalFees,
  aggregateDailyPnl
} from '@/lib/metrics';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { RMultipleHistogram } from '@/components/charts/RMultipleHistogram';
import { DrawdownCurve } from '@/components/charts/DrawdownCurve';
import { calcDrawdown } from '@/lib/metrics';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

export function ReportsPage() {
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined
  });
  const account = useDefaultAccount();

  const currency = account?.currency ?? 'USD';

  const metrics = useMemo(() => {
    if (!trades) return null;
    const closed = trades.filter((t) => t.status === 'closed' && t.closedAt);
    const pnls = closed.map((t) => calcNetPnl(t.executions, t.side));
    const outcomes = closed
      .map((t) => calcTradeOutcome(t.executions))
      .filter((o): o is 'win' | 'loss' | 'breakeven' => o !== null);

    const { winRate, wins, losses } = calcWinRate(outcomes);
    const pf = calcProfitFactor(pnls);
    const exp = calcExpectancy(pnls);
    const fees = closed.reduce((s, t) => s + calcTotalFees(t.executions), 0);

    const holdTimes = closed
      .map((t) => {
        if (!t.closedAt) return null;
        return t.closedAt - t.openedAt;
      })
      .filter((h): h is number => h !== null);
    const avgHold = calcAvgHoldTimeMs(holdTimes);

    const sortedPnls = [...pnls].sort((a, b) => b - a);
    const largestWin = sortedPnls[0] ?? 0;
    const largestLoss = sortedPnls[sortedPnls.length - 1] ?? 0;

    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let consecWins = 0;
    let consecLosses = 0;
    for (const pnl of pnls) {
      if (pnl > 0) {
        consecWins++;
        consecLosses = 0;
        maxConsecWins = Math.max(maxConsecWins, consecWins);
      } else if (pnl < 0) {
        consecLosses++;
        consecWins = 0;
        maxConsecLosses = Math.max(maxConsecLosses, consecLosses);
      } else {
        consecWins = 0;
        consecLosses = 0;
      }
    }

    const dailyPnl = aggregateDailyPnl(closed);
    let cumulative = 0;
    const equityCurve = dailyPnl.map((d) => {
      cumulative += d.netPnl;
      return { date: new Date(d.date + 'T00:00:00').getTime(), value: cumulative };
    });
    const { drawdownCurve, maxDrawdown } = calcDrawdown(equityCurve);

    const rMultiples = closed
      .map((t) => calcRMultiple(t, t.executions))
      .filter((r): r is number => r !== null);
    const rBuckets = new Map<number, number>();
    for (const r of rMultiples) {
      const bucket = Math.round(r * 2) / 2;
      rBuckets.set(bucket, (rBuckets.get(bucket) ?? 0) + 1);
    }
    const rHistogram = Array.from(rBuckets.entries())
      .map(([rMultiple, count]) => ({ rMultiple, count }))
      .sort((a, b) => a.rMultiple - b.rMultiple);

    const avgDailyVolume =
      dailyPnl.length > 0
        ? closed.reduce((s, t) => s + t.executions.reduce((e, x) => e + x.quantity, 0), 0) /
          dailyPnl.length
        : 0;

    return {
      closed,
      pnls,
      totalPnl: pnls.reduce((s, p) => s + p, 0),
      winRate,
      wins,
      losses,
      pf,
      exp,
      fees,
      avgHold,
      largestWin,
      largestLoss,
      maxConsecWins,
      maxConsecLosses,
      avgDailyVolume,
      dailyPnl,
      drawdownCurve,
      maxDrawdown,
      rHistogram,
      rMultiples
    };
  }, [trades]);

  const bySymbol = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<string, { pnl: number; count: number; wins: number }>();
    for (const t of metrics.closed) {
      const pnl = calcNetPnl(t.executions, t.side);
      const existing = map.get(t.symbol) ?? { pnl: 0, count: 0, wins: 0 };
      existing.pnl += pnl;
      existing.count++;
      if (calcTradeOutcome(t.executions) === 'win') existing.wins++;
      map.set(t.symbol, existing);
    }
    return Array.from(map.entries())
      .map(([symbol, data]) => ({ symbol, ...data, winRate: data.wins / data.count }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [metrics]);

  const bySetup = useMemo(() => {
    if (!metrics) return [];
    const map = new Map<string, { pnl: number; count: number; wins: number }>();
    for (const t of metrics.closed) {
      const pbName = t.playbookId ?? 'No Playbook';
      const pnl = calcNetPnl(t.executions, t.side);
      const existing = map.get(pbName) ?? { pnl: 0, count: 0, wins: 0 };
      existing.pnl += pnl;
      existing.count++;
      if (calcTradeOutcome(t.executions) === 'win') existing.wins++;
      map.set(pbName, existing);
    }
    return Array.from(map.entries())
      .map(([setup, data]) => ({ setup, ...data, winRate: data.wins / data.count }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [metrics]);

  if (!metrics) {
    return <div className="skeleton h-64" />;
  }

  if (metrics.closed.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="No data to report"
        description="Add trades within the selected date range to see reports."
      />
    );
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="symbol">By Symbol</TabsTrigger>
        <TabsTrigger value="setup">By Setup</TabsTrigger>
        <TabsTrigger value="risk">Risk</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Overview Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <StatRow label="Total P&L" value={<PnLDisplay value={metrics.totalPnl} currency={currency} />} />
                <StatRow label="Total Trades" value={String(metrics.closed.length)} />
                <StatRow label="Win Rate" value={formatPercent(metrics.winRate)} />
                <StatRow label="Wins / Losses" value={`${metrics.wins} / ${metrics.losses}`} />
                <StatRow label="Profit Factor" value={metrics.pf === Infinity ? '∞' : metrics.pf.toFixed(2)} />
                <StatRow label="Expectancy" value={formatCurrency(metrics.exp, currency)} />
                <StatRow label="Avg Daily Volume" value={metrics.avgDailyVolume.toFixed(0)} />
                <StatRow label="Avg Hold Time" value={`${Math.floor(metrics.avgHold / 60000)}m ${Math.floor((metrics.avgHold % 60000) / 1000)}s`} />
                <StatRow label="Largest Win" value={<PnLDisplay value={metrics.largestWin} currency={currency} />} />
                <StatRow label="Largest Loss" value={<PnLDisplay value={metrics.largestLoss} currency={currency} />} />
                <StatRow label="Max Consecutive Wins" value={String(metrics.maxConsecWins)} />
                <StatRow label="Max Consecutive Losses" value={String(metrics.maxConsecLosses)} />
                <StatRow label="Total Fees" value={formatCurrency(metrics.fees, currency)} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="symbol">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Net P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySymbol.map((row) => (
                  <TableRow key={row.symbol}>
                    <TableCell className="font-semibold">{row.symbol}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{formatPercent(row.winRate)}</TableCell>
                    <TableCell>
                      <PnLDisplay value={row.pnl} currency={currency} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="setup">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Playbook</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Playbook</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Net P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySetup.map((row) => (
                  <TableRow key={row.setup}>
                    <TableCell className="font-semibold">{row.setup}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{formatPercent(row.winRate)}</TableCell>
                    <TableCell>
                      <PnLDisplay value={row.pnl} currency={currency} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="risk">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>R-Multiple Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <RMultipleHistogram data={metrics.rHistogram} height={280} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drawdown Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <DrawdownCurve data={metrics.drawdownCurve} height={280} />
              <div className="mt-2 text-sm text-muted-foreground">
                Max Drawdown: <span className="font-semibold text-loss">{formatCurrency(metrics.maxDrawdown, currency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className="text-right font-medium">{value}</TableCell>
    </TableRow>
  );
}
