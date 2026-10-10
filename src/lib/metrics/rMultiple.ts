import type { Execution, Trade } from '@/types/trade';
import { calcNetPnl, calcAvgEntryPrice, calcTotalQuantity } from './netPnl';

export function calcRMultiple(trade: Trade, executions: Execution[]): number | null {
  if (!trade.plannedStop) return null;

  const avgEntry = calcAvgEntryPrice(executions);
  if (avgEntry === 0) return null;

  const riskPerShare = Math.abs(avgEntry - trade.plannedStop);
  if (riskPerShare === 0) return null;

  const pnl = calcNetPnl(executions, trade.side);
  const totalQty = calcTotalQuantity(executions);

  return pnl / (riskPerShare * totalQty);
}

export function calcPlannedR(trade: Trade, executions: Execution[]): number | null {
  if (!trade.plannedStop || !trade.plannedTarget) return null;

  const avgEntry = calcAvgEntryPrice(executions);
  if (avgEntry === 0) return null;

  const risk = Math.abs(avgEntry - trade.plannedStop);
  const reward = Math.abs(trade.plannedTarget - avgEntry);
  if (risk === 0) return null;

  return reward / risk;
}
