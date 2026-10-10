import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFilterStore } from '@/stores/filterStore';
import { useTradesWithExecutions, useDefaultAccount } from '@/hooks/useRepositories';
import {
  calcNetPnl,
  calcTradeOutcome,
  calcWinRate,
  calcProfitFactor,
  calcDayWinRate,
  calcDrawdown,
  calcConsistency,
  calcRecoveryFactor,
  calcPerformanceScore,
  aggregateDailyPnl
} from '@/lib/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { DonutGauge } from '@/components/charts/DonutGauge';
import { EquityAreaChart } from '@/components/charts/EquityAreaChart';
import { DailyPnlBarChart } from '@/components/charts/DailyPnlBarChart';
import { PerformanceRadar } from '@/components/charts/PerformanceRadar';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { DayDetailDrawer } from './DayDetailDrawer';
import { MonthlyCalendar } from './MonthlyCalendar';
import { RecentTrades } from './RecentTrades';
import { OpenPositions } from './OpenPositions';
import { useState } from 'react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined
  });
  const account = useDefaultAccount();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!trades) return null;

    const closedTrades = trades.filter((t) => t.status === 'closed' && t.closedAt);
    const openTrades = trades.filter((t) => t.status === 'open');

    const pnls = closedTrades.map((t) => calcNetPnl(t.executions, t.side));
    const outcomes = closedTrades
      .map((t) => calcTradeOutcome(t.executions))
      .filter((o): o is 'win' | 'loss' | 'breakeven' => o !== null);

    const netPnl = pnls.reduce((s, p) => s + p, 0);
    const { winRate } = calcWinRate(outcomes);
    const profitFactor = calcProfitFactor(pnls);
    const dailyPnl = aggregateDailyPnl(closedTrades);
    const dayWinRate = calcDayWinRate(dailyPnl.map((d) => d.netPnl));

    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    let cumulative = 0;
    const equityCurve = dailyPnl.map((d) => {
      cumulative += d.netPnl;
      return { date: new Date(d.date + 'T00:00:00').getTime(), value: cumulative };
    });

    const { maxDrawdownPct, maxDrawdown, drawdownCurve } = calcDrawdown(equityCurve);
    const consistency = calcConsistency(dailyPnl.map((d) => d.netPnl));
    const recoveryFactor = calcRecoveryFactor(netPnl, maxDrawdown);

    const score = calcPerformanceScore({
      winRate,
      profitFactor: profitFactor === Infinity ? 10 : profitFactor,
      avgWinLossRatio: avgWinLoss === Infinity ? 5 : avgWinLoss,
      maxDrawdownPct,
      consistency,
      recoveryFactor: recoveryFactor === Infinity ? 5 : recoveryFactor
    });

    const radarData = [
      { subject: 'Win Rate', value: score.components.winRate, fullMark: 100 },
      { subject: 'Profit Factor', value: score.components.profitFactor, fullMark: 100 },
      { subject: 'Avg W/L', value: score.components.avgWinLoss, fullMark: 100 },
      { subject: 'Max DD', value: score.components.maxDrawdown, fullMark: 100 },
      { subject: 'Consistency', value: score.components.consistency, fullMark: 100 },
      { subject: 'Recovery', value: score.components.recoveryFactor, fullMark: 100 }
    ];

    return {
      netPnl,
      winRate,
      profitFactor,
      dayWinRate,
      avgWinLoss,
      score,
      radarData,
      equityCurve,
      dailyPnl,
      drawdownCurve,
      closedTrades,
      openTrades
    };
  }, [trades]);

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (metrics.closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">No trades yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Start tracking your trading performance by adding your first trade or importing
          data from a CSV file.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate('/trades/new')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Add Trade
          </button>
          <button
            onClick={() => navigate('/import')}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Import CSV
          </button>
        </div>
      </div>
    );
  }

  const currency = account?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Net P&L"
          value={metrics.netPnl}
          isPnl
          currency={currency}
          tooltip="Total profit/loss after commissions"
        />
        <StatCard
          label="Trade Win %"
          value={`${(metrics.winRate * 100).toFixed(1)}%`}
          tooltip="Percentage of winning trades"
          gauge={
            <DonutGauge
              value={metrics.winRate * 100}
              color={metrics.winRate >= 0.5 ? '#16C784' : '#EA3943'}
            />
          }
        />
        <StatCard
          label="Profit Factor"
          value={
            metrics.profitFactor === Infinity
              ? '∞'
              : metrics.profitFactor.toFixed(2)
          }
          tooltip="Gross profit divided by gross loss"
        />
        <StatCard
          label="Day Win %"
          value={`${(metrics.dayWinRate * 100).toFixed(1)}%`}
          tooltip="Percentage of profitable trading days"
          gauge={
            <DonutGauge
              value={metrics.dayWinRate * 100}
              color={metrics.dayWinRate >= 0.5 ? '#16C784' : '#EA3943'}
            />
          }
        />
        <StatCard
          label="Avg Win/Loss"
          value={
            metrics.avgWinLoss === Infinity
              ? '∞'
              : metrics.avgWinLoss.toFixed(2)
          }
          tooltip="Average winning trade divided by average losing trade"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <div className="text-2xl font-bold text-primary">{metrics.score.composite}</div>
          </CardHeader>
          <CardContent>
            <PerformanceRadar data={metrics.radarData} height={280} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityAreaChart data={metrics.equityCurve} height={280} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Net P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyPnlBarChart data={metrics.dailyPnl} height={250} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly P&L Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCalendar
              dailyPnl={metrics.dailyPnl}
              currency={currency}
              onDayClick={setSelectedDate}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentTrades trades={metrics.closedTrades} currency={currency} />
        <OpenPositions trades={metrics.openTrades} />
      </div>

      {selectedDate && (
        <DayDetailDrawer
          date={selectedDate}
          trades={metrics.closedTrades.filter((t) => {
            if (!t.closedAt) return false;
            const d = new Date(t.closedAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return key === selectedDate;
          })}
          currency={currency}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
