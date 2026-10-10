export function calcExpectancy(pnls: number[]): number {
  if (pnls.length === 0) return 0;

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const winRate = wins.length / pnls.length;
  const lossRate = losses.length / pnls.length;
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;

  return winRate * avgWin - lossRate * avgLoss;
}
