import type { Execution } from '@/types/trade';
import { calcNetPnl, calcTotalFees } from './netPnl';
import { calcWinRate } from './winRate';
import { calcProfitFactor } from './profitFactor';
import { calcExpectancy } from './expectancy';

export interface DailyStats {
  date: string;
  netPnl: number;
  grossPnl: number;
  tradeCount: number;
  winners: number;
  losers: number;
  commissions: number;
  volume: number;
  profitFactor: number;
  winRate: number;
  expectancy: number;
}

export function calcDailyStats(
  date: string,
  trades: Array<{ executions: Execution[]; closedAt: number | null; side: 'long' | 'short' }>
): DailyStats {
  const dayTrades = trades.filter((t) => {
    if (!t.closedAt) return false;
    const d = new Date(t.closedAt);
    return (
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') ===
      date
    );
  });

  const pnls = dayTrades.map((t) => calcNetPnl(t.executions, t.side));
  const outcomes = pnls.map((p) => (p > 0.005 ? 'win' : p < -0.005 ? 'loss' : 'breakeven'));
  const { wins, losses } = calcWinRate(outcomes);
  const volume = dayTrades.reduce(
    (sum, t) => sum + t.executions.reduce((s, e) => s + e.quantity, 0),
    0
  );

  return {
    date,
    netPnl: pnls.reduce((s, p) => s + p, 0),
    grossPnl: pnls.reduce((s, p) => s + p, 0) + dayTrades.reduce((s, t) => s + calcTotalFees(t.executions), 0),
    tradeCount: dayTrades.length,
    winners: wins,
    losers: losses,
    commissions: dayTrades.reduce((s, t) => s + calcTotalFees(t.executions), 0),
    volume,
    profitFactor: calcProfitFactor(pnls),
    winRate: calcWinRate(outcomes).winRate,
    expectancy: calcExpectancy(pnls)
  };
}
