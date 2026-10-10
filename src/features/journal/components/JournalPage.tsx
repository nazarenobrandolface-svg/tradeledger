import { useMemo } from 'react';
import { useFilterStore } from '@/stores/filterStore';
import { useTradesWithExecutions, useDefaultAccount } from '@/hooks/useRepositories';
import { calcDailyStats } from '@/lib/metrics';
import { format, eachDayOfInterval } from 'date-fns';
import { BookOpen } from 'lucide-react';
import { JournalDayCard } from './JournalDayCard';
import { EmptyState } from '@/components/shared/EmptyState';

export function JournalPage() {
  const { dateFrom, dateTo, accountId } = useFilterStore();
  const trades = useTradesWithExecutions({
    dateFrom,
    dateTo,
    accountId: accountId ?? undefined
  });
  const account = useDefaultAccount();

  const days = useMemo(() => {
    if (!trades) return [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const allDays = eachDayOfInterval({ start, end })
      .filter((d) => d.getDay() >= 1 && d.getDay() <= 5)
      .reverse();

    return allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayTrades = trades.filter((t) => {
        if (!t.closedAt) return false;
        return format(t.closedAt, 'yyyy-MM-dd') === dateKey;
      });
      const stats = calcDailyStats(dateKey, trades);
      return { date: dateKey, dateObj: day, trades: dayTrades, stats };
    });
  }, [trades, dateFrom, dateTo]);

  const daysWithTrades = days.filter((d) => d.trades.length > 0);

  if (!trades) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
    );
  }

  if (daysWithTrades.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-12 w-12" />}
        title="No journal entries"
        description="Your daily journal will populate as you add trades."
      />
    );
  }

  return (
    <div className="space-y-4">
      {daysWithTrades.map((day) => (
        <JournalDayCard key={day.date} day={day} currency={account?.currency ?? 'USD'} />
      ))}
    </div>
  );
}
