import { describe, expect, it } from 'vitest';
import { formatTradeCount } from '@/lib/formatters';

describe('formatTradeCount', () => {
  it('uses the singular form for one trade', () => {
    expect(formatTradeCount(1)).toBe('1 trade');
  });

  it('uses the plural form otherwise', () => {
    expect(formatTradeCount(0)).toBe('0 trades');
    expect(formatTradeCount(5)).toBe('5 trades');
  });
});
