export interface DrawdownResult {
  maxDrawdown: number;
  maxDrawdownPct: number;
  drawdownCurve: Array<{ date: number; drawdown: number; equity: number }>;
  peakEquity: number;
}

export function calcDrawdown(
  equityCurve: Array<{ date: number; value: number }>
): DrawdownResult {
  if (equityCurve.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      drawdownCurve: [],
      peakEquity: 0
    };
  }

  let peak = equityCurve[0]?.value ?? 0;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  const drawdownCurve: DrawdownResult['drawdownCurve'] = [];

  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value;
    const drawdown = peak - point.value;
    const drawdownPct = peak > 0 ? drawdown / peak : 0;

    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;

    drawdownCurve.push({
      date: point.date,
      drawdown,
      equity: point.value
    });
  }

  return { maxDrawdown, maxDrawdownPct, drawdownCurve, peakEquity: peak };
}
