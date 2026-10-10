export function calcProfitFactor(pnls: number[]): number {
  const grossProfit = pnls.filter((p) => p > 0).reduce((sum, p) => sum + p, 0);
  const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((sum, p) => sum + p, 0));

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}
