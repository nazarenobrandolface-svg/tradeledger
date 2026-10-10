export interface SessionWindow {
  startUtcMin: number;
  endUtcMin: number;
}

export interface TradingSession extends SessionWindow {
  id: 'sydney' | 'asia' | 'london' | 'newyork';
  name: string;
  region: string;
}

const SYDNEY: TradingSession = {
  id: 'sydney',
  name: 'Sydney',
  region: 'Australia opens the FX week',
  startUtcMin: 21 * 60,
  endUtcMin: 6 * 60
};

const ASIA: TradingSession = {
  id: 'asia',
  name: 'Asia',
  region: 'Tokyo · Singapore · Hong Kong',
  startUtcMin: 0,
  endUtcMin: 9 * 60
};

const LONDON: TradingSession = {
  id: 'london',
  name: 'London',
  region: 'Europe · largest FX hub',
  startUtcMin: 7 * 60,
  endUtcMin: 16 * 60
};

const NEW_YORK: TradingSession = {
  id: 'newyork',
  name: 'New York',
  region: 'United States · US data releases',
  startUtcMin: 12 * 60,
  endUtcMin: 21 * 60
};

export const TRADING_SESSIONS: TradingSession[] = [SYDNEY, ASIA, LONDON, NEW_YORK];

export const SYDNEY_SESSION: TradingSession = SYDNEY;

export const LONDON_NY_OVERLAP: SessionWindow & { name: string } = {
  name: 'London × New York overlap',
  startUtcMin: 12 * 60,
  endUtcMin: 16 * 60
};

const DAY_MS = 86_400_000;

export function isFxMarketOpen(now: Date): boolean {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (day === 6) return false;
  if (day === 0) return minutes >= 21 * 60;
  if (day === 5) return minutes < 21 * 60;
  return true;
}

export interface SessionStatus {
  open: boolean;
  progress: number;
  secondsToClose: number | null;
  secondsToOpen: number | null;
}

function inWindow(minutes: number, start: number, end: number): boolean {
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function windowLength(start: number, end: number): number {
  return end > start ? end - start : end + 1440 - start;
}

export function nextSessionOpen(session: SessionWindow, now: Date): Date {
  const startMod = session.startUtcMin % 1440;
  const startDayOffset = Math.floor(session.startUtcMin / 1440);
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = 0; i <= 8; i++) {
    const candidate = new Date(base + (i + startDayOffset) * DAY_MS + startMod * 60_000);
    if (candidate.getTime() > now.getTime() && isFxMarketOpen(candidate)) return candidate;
  }
  return new Date(base + 9 * DAY_MS);
}

export function getSessionStatus(session: SessionWindow, now: Date): SessionStatus {
  const { startUtcMin: start, endUtcMin: end } = session;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const seconds = now.getUTCSeconds();

  if (isFxMarketOpen(now) && inWindow(minutes, start, end)) {
    const total = windowLength(start, end);
    const elapsed = minutes >= start ? minutes - start : minutes + 1440 - start;
    return {
      open: true,
      progress: Math.min(Math.max(elapsed / total, 0), 1),
      secondsToClose: Math.max((total - elapsed) * 60 - seconds, 0),
      secondsToOpen: null
    };
  }

  const nextOpen = nextSessionOpen(session, now);
  return {
    open: false,
    progress: 0,
    secondsToClose: null,
    secondsToOpen: Math.max((nextOpen.getTime() - now.getTime()) / 1000, 0)
  };
}

export function localWindowLabel(
  session: SessionWindow,
  now: Date
): { opens: string; closes: string } {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const fmt = (time: number) =>
    new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const crossesMidnight = session.endUtcMin < session.startUtcMin;
  return {
    opens: fmt(base + session.startUtcMin * 60_000),
    closes: fmt(base + session.endUtcMin * 60_000 + (crossesMidnight ? DAY_MS : 0))
  };
}
