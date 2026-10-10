export interface WinRateResult {
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
}

export function calcWinRate(outcomes: ('win' | 'loss' | 'breakeven')[]): WinRateResult {
  const wins = outcomes.filter((o) => o === 'win').length;
  const losses = outcomes.filter((o) => o === 'loss').length;
  const breakevens = outcomes.filter((o) => o === 'breakeven').length;
  const total = outcomes.length;
  const decided = wins + losses;

  return {
    winRate: decided === 0 ? 0 : wins / decided,
    totalTrades: total,
    wins,
    losses,
    breakevens
  };
}

export function calcDayWinRate(dailyPnls: number[]): number {
  const winningDays = dailyPnls.filter((p) => p > 0).length;
  const totalDays = dailyPnls.length;
  return totalDays === 0 ? 0 : winningDays / totalDays;
}
