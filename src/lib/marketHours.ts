const NY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hourCycle: 'h23',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const OPEN_SECONDS = 9 * 3600 + 30 * 60;
const CLOSE_SECONDS = 16 * 3600;

export interface MarketStatus {
  open: boolean;
  secondsToClose: number;
}

export function getMarketStatus(now: Date): MarketStatus {
  const parts = NY_FORMATTER.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  const weekday = part('weekday');
  const seconds =
    Number(part('hour')) * 3600 + Number(part('minute')) * 60 + Number(part('second'));
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const open = !isWeekend && seconds >= OPEN_SECONDS && seconds < CLOSE_SECONDS;

  return { open, secondsToClose: Math.max(CLOSE_SECONDS - seconds, 0) };
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
