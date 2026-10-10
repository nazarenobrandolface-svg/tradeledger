import { formatDistanceStrict } from 'date-fns';

export function calcHoldTime(openedAt: number, closedAt: number | null): string | null {
  if (!closedAt) return null;
  return formatDistanceStrict(closedAt, openedAt);
}

export function calcHoldTimeMs(openedAt: number, closedAt: number | null): number | null {
  if (!closedAt) return null;
  return closedAt - openedAt;
}

export function calcAvgHoldTimeMs(holdTimes: number[]): number {
  if (holdTimes.length === 0) return 0;
  return holdTimes.reduce((sum, t) => sum + t, 0) / holdTimes.length;
}
