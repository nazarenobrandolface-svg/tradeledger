import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCountdown, getMarketStatus, type MarketStatus } from '@/lib/marketHours';

export function MarketClock() {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getMarketStatus(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      title="US market hours: 9:30 AM – 4:00 PM ET"
      className={cn(
        'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium tabular-nums',
        status.open
          ? 'border-profit/30 bg-profit/10 text-foreground'
          : 'border-border bg-muted/40 text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          status.open ? 'animate-pulse bg-profit' : 'bg-muted-foreground/50'
        )}
      />
      {status.open ? `Closes in ${formatCountdown(status.secondsToClose)}` : 'Market closed'}
    </div>
  );
}
