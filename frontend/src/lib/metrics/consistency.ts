export function calcConsistency(dailyPnls: number[]): number {
  if (dailyPnls.length === 0) return 0;

  const mean = dailyPnls.reduce((s, p) => s + p, 0) / dailyPnls.length;
  if (mean === 0) return 0;

  const variance = dailyPnls.reduce((s, p) => s + (p - mean) ** 2, 0) / dailyPnls.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = Math.abs(mean) / stdDev;

  // Normalize to 0-1 score
  return Math.min(1, coefficientOfVariation / 3);
}
