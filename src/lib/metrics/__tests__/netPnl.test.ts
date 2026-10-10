import { describe, it, expect } from 'vitest';
import {
  calcNetPnl,
  calcGrossPnl,
  calcAvgEntryPrice,
  calcAvgExitPrice,
  calcTotalQuantity,
  calcTotalFees,
  calcTradeOutcome
} from '../netPnl';
import type { Execution } from '@/types/trade';

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

describe('calcNetPnl', () => {
  it('returns 0 for no executions', () => {
    expect(calcNetPnl([])).toBe(0);
  });

  it('calculates profit for winning long trade', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 110, quantity: 10 })
    ];
    expect(calcNetPnl(execs)).toBe(100);
  });

  it('calculates loss for losing long trade', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 95, quantity: 10 })
    ];
    expect(calcNetPnl(execs)).toBe(-50);
  });

  it('calculates profit for winning short trade', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 90, quantity: 10 })
    ];
    expect(calcNetPnl(execs, 'short')).toBe(100);
  });

  it('accounts for fees', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10, fees: 5 }),
      makeExec({ type: 'exit', price: 110, quantity: 10, fees: 5 })
    ];
    expect(calcNetPnl(execs)).toBe(90);
  });

  it('handles partial fills - scale in', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 5 }),
      makeExec({ type: 'entry', price: 102, quantity: 5 }),
      makeExec({ type: 'exit', price: 110, quantity: 10 })
    ];
    expect(calcNetPnl(execs)).toBe(90);
  });

  it('handles partial fills - scale out', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'exit', price: 110, quantity: 5 }),
      makeExec({ type: 'exit', price: 120, quantity: 5 })
    ];
    expect(calcNetPnl(execs)).toBe(150);
  });

  it('returns 0 for breakeven trade', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10, fees: 10 }),
      makeExec({ type: 'exit', price: 101, quantity: 10, fees: 0 })
    ];
    expect(calcNetPnl(execs)).toBe(0);
  });
});

describe('calcGrossPnl', () => {
  it('excludes fees', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10, fees: 5 }),
      makeExec({ type: 'exit', price: 110, quantity: 10, fees: 5 })
    ];
    expect(calcGrossPnl(execs)).toBe(100);
  });
});

describe('calcAvgEntryPrice', () => {
  it('returns 0 for no entries', () => {
    expect(calcAvgEntryPrice([])).toBe(0);
  });

  it('calculates weighted average', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10 }),
      makeExec({ type: 'entry', price: 110, quantity: 10 })
    ];
    expect(calcAvgEntryPrice(execs)).toBe(105);
  });
});

describe('calcAvgExitPrice', () => {
  it('returns 0 for no exits', () => {
    expect(calcAvgExitPrice([])).toBe(0);
  });
});

describe('calcTotalQuantity', () => {
  it('sums entry quantities', () => {
    const execs = [
      makeExec({ type: 'entry', quantity: 10 }),
      makeExec({ type: 'entry', quantity: 5 }),
      makeExec({ type: 'exit', quantity: 15 })
    ];
    expect(calcTotalQuantity(execs)).toBe(15);
  });
});

describe('calcTotalFees', () => {
  it('sums all fees', () => {
    const execs = [
      makeExec({ fees: 1.5 }),
      makeExec({ fees: 2.5 })
    ];
    expect(calcTotalFees(execs)).toBe(4);
  });
});

describe('calcTradeOutcome', () => {
  it('returns null for no executions', () => {
    expect(calcTradeOutcome([])).toBeNull();
  });

  it('returns win for profit', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100 }),
      makeExec({ type: 'exit', price: 110 })
    ];
    expect(calcTradeOutcome(execs)).toBe('win');
  });

  it('returns loss for loss', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100 }),
      makeExec({ type: 'exit', price: 90 })
    ];
    expect(calcTradeOutcome(execs)).toBe('loss');
  });

  it('returns breakeven for zero P&L', () => {
    const execs = [
      makeExec({ type: 'entry', price: 100, quantity: 10, fees: 5 }),
      makeExec({ type: 'exit', price: 100.5, quantity: 10, fees: 0 })
    ];
    // entryCost = 100*10 = 1000, exitProceeds = 100.5*10 = 1005, fees = 5
    // netPnl = 1005 - 1000 - 5 = 0
    expect(calcTradeOutcome(execs)).toBe('breakeven');
  });
});
