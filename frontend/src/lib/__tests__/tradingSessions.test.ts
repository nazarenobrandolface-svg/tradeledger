import { describe, expect, it } from 'vitest';
import {
  TRADING_SESSIONS,
  getSessionStatus,
  isFxMarketOpen,
  nextSessionOpen,
  type TradingSession
} from '../tradingSessions';

const at = (iso: string) => new Date(iso);

const session = (id: TradingSession['id']): TradingSession => {
  const found = TRADING_SESSIONS.find((s) => s.id === id);
  if (!found) throw new Error(`missing session ${id}`);
  return found;
};

describe('isFxMarketOpen', () => {
  it('is open around the clock mid-week', () => {
    expect(isFxMarketOpen(at('2026-10-14T00:00:00Z'))).toBe(true);
    expect(isFxMarketOpen(at('2026-10-14T23:59:00Z'))).toBe(true);
  });

  it('closes Friday at 21:00 UTC', () => {
    expect(isFxMarketOpen(at('2026-10-16T20:59:00Z'))).toBe(true);
    expect(isFxMarketOpen(at('2026-10-16T21:00:00Z'))).toBe(false);
  });

  it('stays closed all Saturday', () => {
    expect(isFxMarketOpen(at('2026-10-17T12:00:00Z'))).toBe(false);
  });

  it('reopens Sunday at 21:00 UTC', () => {
    expect(isFxMarketOpen(at('2026-10-18T20:59:00Z'))).toBe(false);
    expect(isFxMarketOpen(at('2026-10-18T21:00:00Z'))).toBe(true);
  });
});

describe('getSessionStatus', () => {
  it('marks London open during its hours with correct countdown', () => {
    const status = getSessionStatus(session('london'), at('2026-10-14T08:00:00Z'));
    expect(status.open).toBe(true);
    expect(status.secondsToClose).toBe(8 * 3600);
    expect(status.progress).toBeCloseTo(60 / 540, 3);
  });

  it('marks London closed outside its hours', () => {
    expect(getSessionStatus(session('london'), at('2026-10-14T17:00:00Z')).open).toBe(false);
  });

  it('ignores the weekend even inside session hours', () => {
    const status = getSessionStatus(session('london'), at('2026-10-17T08:00:00Z'));
    expect(status.open).toBe(false);
    expect(status.secondsToOpen).toBeGreaterThan(0);
  });

  it('handles the Sydney window crossing midnight', () => {
    expect(getSessionStatus(session('sydney'), at('2026-10-14T23:00:00Z')).open).toBe(true);
    expect(getSessionStatus(session('sydney'), at('2026-10-15T05:00:00Z')).open).toBe(true);
    expect(getSessionStatus(session('sydney'), at('2026-10-14T07:00:00Z')).open).toBe(false);
  });

  it('shows the London × New York overlap during 12:00–16:00 UTC', () => {
    const overlap = { startUtcMin: 12 * 60, endUtcMin: 16 * 60 };
    expect(getSessionStatus(overlap, at('2026-10-14T13:00:00Z')).open).toBe(true);
    expect(getSessionStatus(overlap, at('2026-10-14T17:00:00Z')).open).toBe(false);
  });
});

describe('nextSessionOpen', () => {
  it('skips the weekend and returns Sunday 21:00 UTC', () => {
    const next = nextSessionOpen(session('sydney'), at('2026-10-17T12:00:00Z'));
    expect(next.toISOString()).toBe('2026-10-18T21:00:00.000Z');
  });

  it('returns the next daily start even while the session is open', () => {
    const next = nextSessionOpen(session('london'), at('2026-10-14T08:00:00Z'));
    expect(next.toISOString()).toBe('2026-10-15T07:00:00.000Z');
  });
});
