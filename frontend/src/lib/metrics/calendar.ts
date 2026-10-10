import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  startOfWeek,
  endOfWeek,
  addWeeks
} from 'date-fns';
import type { Execution } from '@/types/trade';
import { calcNetPnl } from './netPnl';

export interface DayPnl {
  date: string;
  netPnl: number;
  tradeCount: number;
}

export interface CalendarWeek {
  days: DayPnl[];
  total: number;
  totalTrades: number;
}

export interface MonthCalendar {
  month: string;
  weeks: CalendarWeek[];
  monthTotal: number;
  monthTrades: number;
}

export function aggregateDailyPnl(
  trades: Array<{ executions: Execution[]; closedAt: number | null; side: 'long' | 'short' }>
): DayPnl[] {
  const map = new Map<string, { pnl: number; count: number }>();

  for (const trade of trades) {
    if (!trade.closedAt) continue;
    const dateKey = format(trade.closedAt, 'yyyy-MM-dd');
    const pnl = calcNetPnl(trade.executions, trade.side);
    const existing = map.get(dateKey);
    if (existing) {
      existing.pnl += pnl;
      existing.count += 1;
    } else {
      map.set(dateKey, { pnl, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([date, data]) => ({ date, netPnl: data.pnl, tradeCount: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMonthCalendar(
  month: Date,
  dailyPnl: DayPnl[]
): MonthCalendar {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const pnlMap = new Map(dailyPnl.map((d) => [d.date, d]));

  const weeks: CalendarWeek[] = [];
  let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  while (currentWeekStart <= monthEnd) {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd }).map(
      (day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const inMonth = day >= monthStart && day <= monthEnd;
        const data = pnlMap.get(dateKey);
        return {
          date: dateKey,
          netPnl: inMonth && data ? data.netPnl : 0,
          tradeCount: inMonth && data ? data.tradeCount : 0
        };
      }
    );

    const monthDays = weekDays.filter((d) => {
      const day = new Date(d.date + 'T00:00:00');
      return day >= monthStart && day <= monthEnd;
    });

    weeks.push({
      days: weekDays,
      total: monthDays.reduce((s, d) => s + d.netPnl, 0),
      totalTrades: monthDays.reduce((s, d) => s + d.tradeCount, 0)
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
    if (weeks.length > 6) break;
  }

  return {
    month: format(monthStart, 'MMMM yyyy'),
    weeks,
    monthTotal: dailyPnl
      .filter((d) => {
        const day = new Date(d.date + 'T00:00:00');
        return day >= monthStart && day <= monthEnd;
      })
      .reduce((s, d) => s + d.netPnl, 0),
    monthTrades: dailyPnl
      .filter((d) => {
        const day = new Date(d.date + 'T00:00:00');
        return day >= monthStart && day <= monthEnd;
      })
      .reduce((s, d) => s + d.tradeCount, 0)
  };
}

export function getDayOfWeek(dateStr: string): number {
  return getDay(new Date(dateStr + 'T00:00:00'));
}
