import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, getDay, isSameMonth, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { DayPnl } from '@/lib/metrics';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthlyCalendarProps {
  dailyPnl: DayPnl[];
  currency?: string;
  onDayClick?: (date: string) => void;
}

export function MonthlyCalendar({ dailyPnl, currency = 'USD', onDayClick }: MonthlyCalendarProps) {
  const [month, setMonth] = useState(new Date());

  const { weeks, monthTotal, monthTrades } = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const pnlMap = new Map(dailyPnl.map((d) => [d.date, d]));

    const calendarStart = new Date(monthStart);
    const startDow = (getDay(monthStart) + 6) % 7;
    calendarStart.setDate(calendarStart.getDate() - startDow);

    const allDays: Array<{ date: Date; data?: DayPnl; inMonth: boolean }> = [];
    const cursor = new Date(calendarStart);
    for (let i = 0; i < 42; i++) {
      const dateKey = format(cursor, 'yyyy-MM-dd');
      allDays.push({
        date: new Date(cursor),
        data: pnlMap.get(dateKey),
        inMonth: isSameMonth(cursor, month)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeksArr: typeof allDays[] = [];
    for (let i = 0; i < 42; i += 7) {
      weeksArr.push(allDays.slice(i, i + 7));
    }

    const mt = dailyPnl
      .filter((d) => {
        const day = new Date(d.date + 'T00:00:00');
        return day >= monthStart && day <= monthEnd;
      })
      .reduce((s, d) => s + d.netPnl, 0);

    const mtr = dailyPnl
      .filter((d) => {
        const day = new Date(d.date + 'T00:00:00');
        return day >= monthStart && day <= monthEnd;
      })
      .reduce((s, d) => s + d.tradeCount, 0);

    return { weeks: weeksArr, monthTotal: mt, monthTrades: mtr };
  }, [month, dailyPnl]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-1 text-xs">
        <div className="py-1 text-center font-medium text-muted-foreground">Mon</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Tue</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Wed</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Thu</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Fri</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Sat</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Sun</div>
        <div className="py-1 text-center font-medium text-muted-foreground">Total</div>

        {weeks.map((week, wi) => {
          const weekTotal = week
            .filter((d) => d.inMonth)
            .reduce((s, d) => s + (d.data?.netPnl ?? 0), 0);
          const weekTrades = week
            .filter((d) => d.inMonth)
            .reduce((s, d) => s + (d.data?.tradeCount ?? 0), 0);

          return (
            <>
              {week.map((day, di) => {
                const pnl = day.inMonth ? (day.data?.netPnl ?? 0) : 0;
                const trades = day.inMonth ? (day.data?.tradeCount ?? 0) : 0;
                const isProfit = pnl > 0;
                const isLoss = pnl < 0;

                return (
                  <button
                    key={`${wi}-${di}`}
                    onClick={() => {
                      if (day.inMonth && trades > 0) {
                        onDayClick?.(format(day.date, 'yyyy-MM-dd'));
                      }
                    }}
                    disabled={!day.inMonth || trades === 0}
                    className={cn(
                      'min-h-[48px] rounded-md p-1 text-left transition-colors',
                      !day.inMonth && 'opacity-30',
                      day.inMonth && trades > 0 && 'cursor-pointer hover:opacity-80',
                      isProfit && 'bg-profit/10',
                      isLoss && 'bg-loss/10',
                      day.inMonth && trades === 0 && 'bg-muted/30'
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground">
                      {format(day.date, 'd')}
                    </div>
                    {trades > 0 && (
                      <>
                        <div
                          className={cn(
                            'text-[10px] font-semibold',
                            isProfit && 'text-profit',
                            isLoss && 'text-loss'
                          )}
                        >
                          {formatCurrency(pnl, currency)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{trades}t</div>
                      </>
                    )}
                  </button>
                );
              })}
              <div
                className={cn(
                  'flex min-h-[48px] flex-col justify-center rounded-md bg-muted/50 p-1 text-center',
                  weekTotal > 0 && 'bg-profit/5',
                  weekTotal < 0 && 'bg-loss/5'
                )}
              >
                <div
                  className={cn(
                    'text-[10px] font-semibold',
                    weekTotal > 0 && 'text-profit',
                    weekTotal < 0 && 'text-loss'
                  )}
                >
                  {weekTrades > 0 ? formatCurrency(weekTotal, currency) : ''}
                </div>
                {weekTrades > 0 && (
                  <div className="text-[9px] text-muted-foreground">{weekTrades}t</div>
                )}
              </div>
            </>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
        <span className="text-muted-foreground">
          {monthTrades} trades in {format(month, 'MMMM')}
        </span>
        <span
          className={cn(
            'font-bold',
            monthTotal >= 0 ? 'text-profit' : 'text-loss'
          )}
        >
          {formatCurrency(monthTotal, currency)}
        </span>
      </div>
    </div>
  );
}
