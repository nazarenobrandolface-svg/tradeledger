const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: number, currency = 'USD'): string {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

export function formatPnl(value: number, currency = 'USD'): string {
  const abs = Math.abs(value);
  const formatted = formatCurrency(abs, currency);
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function formatShareCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
