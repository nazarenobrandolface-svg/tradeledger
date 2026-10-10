export interface PerformanceScoreInput {
  winRate: number;
  profitFactor: number;
  avgWinLossRatio: number;
  maxDrawdownPct: number;
  consistency: number;
  recoveryFactor: number;
}

export interface PerformanceScore {
  composite: number;
  components: {
    winRate: number;
    profitFactor: number;
    avgWinLoss: number;
    maxDrawdown: number;
    consistency: number;
    recoveryFactor: number;
  };
}

export function calcPerformanceScore(input: PerformanceScoreInput): PerformanceScore {
  const winRateScore = Math.min(1, input.winRate / 0.6) * 100;

  const pfScore = input.profitFactor === Infinity ? 100 : Math.min(1, input.profitFactor / 3) * 100;

  const awlScore = Math.min(1, input.avgWinLossRatio / 2) * 100;

  const ddScore = Math.max(0, (1 - input.maxDrawdownPct / 0.5)) * 100;

  const consistencyScore = input.consistency * 100;

  const rfScore = Math.min(1, Math.max(0, input.recoveryFactor / 3)) * 100;

  const composite =
    winRateScore * 0.2 +
    pfScore * 0.2 +
    awlScore * 0.15 +
    ddScore * 0.2 +
    consistencyScore * 0.15 +
    rfScore * 0.1;

  return {
    composite: Math.round(composite),
    components: {
      winRate: Math.round(winRateScore),
      profitFactor: Math.round(pfScore),
      avgWinLoss: Math.round(awlScore),
      maxDrawdown: Math.round(ddScore),
      consistency: Math.round(consistencyScore),
      recoveryFactor: Math.round(rfScore)
    }
  };
}

export function calcRecoveryFactor(netPnl: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return netPnl > 0 ? Infinity : 0;
  return netPnl / maxDrawdown;
}
