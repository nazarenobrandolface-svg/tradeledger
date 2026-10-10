import { describe, it, expect } from 'vitest';
import { calcWinRate, calcDayWinRate } from '../winRate';
import { calcProfitFactor } from '../profitFactor';
import { calcExpectancy } from '../expectancy';
import { calcDrawdown } from '../drawdown';
import { calcConsistency } from '../consistency';
import { calcRecoveryFactor, calcPerformanceScore } from '../performanceScore';
import { calcRMultiple } from '../rMultiple';
import type { Trade, Execution } from '@/types/trade';

function makeExec(partial: Partial<Execution>): Execution {
  return {
    id: Math.random().toString(36).slice(2),
    tradeId: 't1',
    type: 'entry',
    price: 100,
    quantity: 10,
    fees: 0,
    executedAt: Date.now(),
    note: null,
    ...partial
  };
}

function makeTrade(partial: Partial<Trade>): Trade {
  return {
    id: 't1',
    accountId: 'a1',
    symbol: 'AAPL',
    side: 'long',
    status: 'closed',
    openedAt: Date.now(),
    closedAt: Date.now(),
    plannedEntry: null,
    plannedStop: null,
    plannedTarget: null,
    rating: null,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial
  };
}

describe('calcWinRate', () => {
  it('returns 0 for empty', () => {
    expect(calcWinRate([]).winRate).toBe(0);
  });

  it('calculates win rate excluding breakevens', () => {
    const result = calcWinRate(['win', 'loss', 'win', 'loss', 'breakeven']);
    expect(result.winRate).toBe(0.5);
    expect(result.wins).toBe(2);
    expect(result.losses).toBe(2);
    expect(result.breakevens).toBe(1);
  });

  it('handles all wins', () => {
    expect(calcWinRate(['win', 'win', 'win']).winRate).toBe(1);
  });

  it('handles all losses', () => {
    expect(calcWinRate(['loss', 'loss']).winRate).toBe(0);
  });
});

describe('calcDayWinRate', () => {
  it('returns 0 for empty', () => {
    expect(calcDayWinRate([])).toBe(0);
  });

  it('calculates percentage of positive days', () => {
    expect(calcDayWinRate([100, -50, 200, -10, 50])).toBe(0.6);
  });
});

describe('calcProfitFactor', () => {
  it('returns 0 when no trades', () => {
    expect(calcProfitFactor([])).toBe(0);
  });

  it('returns Infinity when no losses', () => {
    expect(calcProfitFactor([100, 200])).toBe(Infinity);
  });

  it('returns 0 when no profits', () => {
    expect(calcProfitFactor([-100, -200])).toBe(0);
  });

  it('calculates ratio', () => {
    expect(calcProfitFactor([200, 100, -150])).toBe(2);
  });
});

describe('calcExpectancy', () => {
  it('returns 0 for no trades', () => {
    expect(calcExpectancy([])).toBe(0);
  });

  it('calculates expectancy', () => {
    // 2 wins avg 100, 2 losses avg 50 => 0.5*100 - 0.5*50 = 25
    expect(calcExpectancy([100, 100, -50, -50])).toBe(25);
  });
});

describe('calcDrawdown', () => {
  it('returns zeros for empty', () => {
    const result = calcDrawdown([]);
    expect(result.maxDrawdown).toBe(0);
  });

  it('calculates max drawdown', () => {
    const curve = [
      { date: 1, value: 100 },
      { date: 2, value: 150 },
      { date: 3, value: 80 },
      { date: 4, value: 120 }
    ];
    const result = calcDrawdown(curve);
    expect(result.maxDrawdown).toBe(70);
    expect(result.peakEquity).toBe(150);
  });

  it('no drawdown for monotonically increasing', () => {
    const curve = [
      { date: 1, value: 100 },
      { date: 2, value: 200 },
      { date: 3, value: 300 }
    ];
    expect(calcDrawdown(curve).maxDrawdown).toBe(0);
  });
});

describe('calcConsistency', () => {
  it('returns 0 for empty', () => {
    expect(calcConsistency([])).toBe(0);
  });

  it('higher for consistent results', () => {
    const consistent = calcConsistency([10, 11, 9, 10, 11]);
    const inconsistent = calcConsistency([100, -80, 120, -90, 50]);
    expect(consistent).toBeGreaterThan(inconsistent);
  });
});

describe('calcRecoveryFactor', () => {
  it('returns 0 when no drawdown and no profit', () => {
    expect(calcRecoveryFactor(0, 0)).toBe(0);
  });

  it('returns Infinity when no drawdown with profit', () => {
    expect(calcRecoveryFactor(100, 0)).toBe(Infinity);
  });

  it('calculates recovery factor', () => {
    expect(calcRecoveryFactor(200, 100)).toBe(2);
  });
});

describe('calcPerformanceScore', () => {
  it('returns valid score 0-100', () => {
    const result = calcPerformanceScore({
      winRate: 0.5,
      profitFactor: 1.5,
      avgWinLossRatio: 1.2,
      maxDrawdownPct: 0.1,
      consistency: 0.6,
      recoveryFactor: 2
    });
    expect(result.composite).toBeGreaterThanOrEqual(0);
    expect(result.composite).toBeLessThanOrEqual(100);
  });

  it('perfect metrics give high score', () => {
    const result = calcPerformanceScore({
      winRate: 0.6,
      profitFactor: 3,
      avgWinLossRatio: 2,
      maxDrawdownPct: 0,
      consistency: 1,
      recoveryFactor: 3
    });
    expect(result.composite).toBeGreaterThanOrEqual(95);
  });

  it('poor metrics give low score', () => {
    const result = calcPerformanceScore({
      winRate: 0.2,
      profitFactor: 0.5,
      avgWinLossRatio: 0.3,
      maxDrawdownPct: 0.5,
      consistency: 0.1,
      recoveryFactor: -1
    });
    expect(result.composite).toBeLessThan(50);
  });
});

describe('calcRMultiple', () => {
  it('returns null without planned stop', () => {
    const trade = makeTrade({ plannedStop: null });
    const execs = [makeExec({})];
    expect(calcRMultiple(trade, execs)).toBeNull();
  });

  it('returns null for zero-risk trade', () => {
    const trade = makeTrade({ plannedStop: 100, plannedEntry: 100 });
    const execs = [makeExec({ price: 100 })];
    expect(calcRMultiple(trade, execs)).toBeNull();
  });

  it('calculates R-multiple for win', () => {
    const trade = makeTrade({ plannedStop: 95, plannedEntry: 100 });
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 110, quantity: 10 })
    ];
    // Risk = 5/share, 10 shares = $50 risk, profit = $100, R = 2
    expect(calcRMultiple(trade, execs)).toBe(2);
  });

  it('calculates R-multiple for loss', () => {
    const trade = makeTrade({ plannedStop: 95, plannedEntry: 100 });
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 97, quantity: 10 })
    ];
    // Risk = $50, loss = $30, R = -0.6
    expect(calcRMultiple(trade, execs)).toBeCloseTo(-0.6);
  });
});
