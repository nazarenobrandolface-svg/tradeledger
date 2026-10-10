import type { Execution, Trade, TradeOutcome } from '@/types/trade';

export function calcNetPnl(executions: Execution[], side: 'long' | 'short' = 'long'): number {
  const entryExecs = executions.filter((e) => e.type === 'entry');
  const exitExecs = executions.filter((e) => e.type === 'exit');

  const entryCost = entryExecs.reduce((sum, e) => sum + e.price * e.quantity, 0);
  const exitProceeds = exitExecs.reduce((sum, e) => sum + e.price * e.quantity, 0);
  const totalFees = executions.reduce((sum, e) => sum + e.fees, 0);

  if (side === 'short') {
    return entryCost - exitProceeds - totalFees;
  }
  return exitProceeds - entryCost - totalFees;
}

export function calcGrossPnl(executions: Execution[], side: 'long' | 'short' = 'long'): number {
  return calcNetPnl(executions, side) + executions.reduce((sum, e) => sum + e.fees, 0);
}

export function calcAvgEntryPrice(executions: Execution[]): number {
  const entryExecs = executions.filter((e) => e.type === 'entry');
  const totalQty = entryExecs.reduce((sum, e) => sum + e.quantity, 0);
  if (totalQty === 0) return 0;
  return entryExecs.reduce((sum, e) => sum + e.price * e.quantity, 0) / totalQty;
}

export function calcAvgExitPrice(executions: Execution[]): number {
  const exitExecs = executions.filter((e) => e.type === 'exit');
  const totalQty = exitExecs.reduce((sum, e) => sum + e.quantity, 0);
  if (totalQty === 0) return 0;
  return exitExecs.reduce((sum, e) => sum + e.price * e.quantity, 0) / totalQty;
}

export function calcTotalQuantity(executions: Execution[]): number {
  const entryExecs = executions.filter((e) => e.type === 'entry');
  return entryExecs.reduce((sum, e) => sum + e.quantity, 0);
}

export function calcTotalFees(executions: Execution[]): number {
  return executions.reduce((sum, e) => sum + e.fees, 0);
}

export function calcTradeOutcome(
  executions: Execution[],
  side: 'long' | 'short' = 'long'
): TradeOutcome | null {
  const pnl = calcNetPnl(executions, side);
  if (pnl > 0.005) return 'win';
  if (pnl < -0.005) return 'loss';
  if (executions.length > 0) return 'breakeven';
  return null;
}

export function isTradeClosed(trade: Trade): boolean {
  return trade.status === 'closed' && trade.closedAt !== null;
}
