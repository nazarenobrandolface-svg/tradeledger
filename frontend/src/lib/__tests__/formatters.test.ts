import { describe, expect, it } from 'vitest';
import { formatFileSize, formatTradeCount } from '@/lib/formatters';

describe('formatTradeCount', () => {
  it('uses the singular form for one trade', () => {
    expect(formatTradeCount(1)).toBe('1 trade');
  });

  it('uses the plural form otherwise', () => {
    expect(formatTradeCount(0)).toBe('0 trades');
    expect(formatTradeCount(5)).toBe('5 trades');
  });
});

describe('formatFileSize', () => {
  it('scales units with the size', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatFileSize(120 * 1024 * 1024)).toBe('120 MB');
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });
});
