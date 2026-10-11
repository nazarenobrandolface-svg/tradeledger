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

const compactCurrencyFormatters = new Map<string, Intl.NumberFormat>();

/** Compact currency for tight spaces (e.g. calendar cells): "$1.2K", "-$340". */
export function formatCompactCurrency(value: number, currency = 'USD'): string {
  let formatter = compactCurrencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    });
    compactCurrencyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
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

export function formatTradeCount(value: number): string {
  return `${value} ${value === 1 ? 'trade' : 'trades'}`;
}

export function formatCategory(
  category: 'forex' | 'indices' | 'futures' | 'stocks' | null | undefined
): string {
  if (!category) return '—';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}
