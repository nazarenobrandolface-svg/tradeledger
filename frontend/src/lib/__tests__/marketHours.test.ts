import { describe, expect, it } from 'vitest';
import { formatCountdown, getMarketStatus } from '@/lib/marketHours';

describe('getMarketStatus', () => {
  it('is open at 9:30 AM ET on a weekday', () => {
    const status = getMarketStatus(new Date('2026-01-08T14:30:00Z'));
    expect(status.open).toBe(true);
    expect(status.secondsToClose).toBe(6.5 * 3600);
  });

  it('counts down to the 4:00 PM ET close', () => {
    const status = getMarketStatus(new Date('2026-01-08T20:15:00Z'));
    expect(status.open).toBe(true);
    expect(status.secondsToClose).toBe(45 * 60);
  });

  it('is closed before the open', () => {
    expect(getMarketStatus(new Date('2026-01-08T14:00:00Z')).open).toBe(false);
  });

  it('is closed after the close', () => {
    expect(getMarketStatus(new Date('2026-01-08T21:30:00Z')).open).toBe(false);
  });

  it('is closed on weekends even during market hours', () => {
    expect(getMarketStatus(new Date('2026-01-10T15:00:00Z')).open).toBe(false);
  });

  it('uses New York time, not local time', () => {
    // 15:00 UTC = 10:00 ET (EST) — open regardless of the machine timezone.
    expect(getMarketStatus(new Date('2026-01-08T15:00:00Z')).open).toBe(true);
  });
});

describe('formatCountdown', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatCountdown(6.5 * 3600)).toBe('6:30:00');
    expect(formatCountdown(2700)).toBe('0:45:00');
    expect(formatCountdown(59)).toBe('0:00:59');
    expect(formatCountdown(3725)).toBe('1:02:05');
  });
});
