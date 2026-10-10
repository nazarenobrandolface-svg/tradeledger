import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCountdown } from '@/lib/marketHours';
import {
  LONDON_NY_OVERLAP,
  SYDNEY_SESSION,
  TRADING_SESSIONS,
  getSessionStatus,
  isFxMarketOpen,
  localWindowLabel,
  nextSessionOpen,
  type TradingSession
} from '@/lib/tradingSessions';

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const UTC_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

function StatusPill({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        open ? 'bg-profit/15 text-profit' : 'bg-muted text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          open ? 'animate-pulse bg-profit' : 'bg-muted-foreground/50'
        )}
      />
      {open ? 'Open' : 'Closed'}
    </span>
  );
}

function SessionCard({
  session,
  now
}: {
  session: Pick<TradingSession, 'name' | 'region' | 'startUtcMin' | 'endUtcMin'>;
  now: Date;
}) {
  const status = getSessionStatus(session, now);
  const label = localWindowLabel(session, now);
  const utcLabel = `${padMinutes(session.startUtcMin)}–${padMinutes(session.endUtcMin)} UTC`;

  return (
    <Card className={cn(status.open && 'border-profit/40 shadow-sm shadow-profit/10')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold leading-tight">{session.name}</h3>
            <p className="text-xs text-muted-foreground">{session.region}</p>
          </div>
          <StatusPill open={status.open} />
        </div>

        <div className="text-sm">
          <div className="font-medium text-foreground">
            {label.opens} – {label.closes}
          </div>
          <div className="text-xs text-muted-foreground">{utcLabel}</div>
        </div>

        {status.open ? (
          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-profit transition-all duration-1000"
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">
              Closes in {formatCountdown(Math.round(status.secondsToClose ?? 0))}
            </div>
          </div>
        ) : (
          <div className="text-xs tabular-nums text-muted-foreground">
            Opens in {formatCountdown(Math.round(status.secondsToOpen ?? 0))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function padMinutes(minutes: number): string {
  const mod = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(mod / 60);
  const m = mod % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function SessionsPage() {
  const now = useNow();
  const marketOpen = isFxMarketOpen(now);
  const active = TRADING_SESSIONS.filter((s) => getSessionStatus(s, now).open);
  const overlap = getSessionStatus(LONDON_NY_OVERLAP, now);
  const overlapLabel = localWindowLabel(LONDON_NY_OVERLAP, now);
  const marketOpensAt = nextSessionOpen(SYDNEY_SESSION, now);
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Which FX session is live right now · times shown in your timezone ({localZone})
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Local</div>
            <div className="text-xl font-semibold tabular-nums">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">UTC</div>
            <div className="text-xl font-semibold tabular-nums">{UTC_FORMAT.format(now)}</div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
          marketOpen
            ? 'border-profit/30 bg-profit/10'
            : 'border-border bg-muted/40'
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              marketOpen ? 'animate-pulse bg-profit' : 'bg-muted-foreground/50'
            )}
          />
          <span className="text-sm font-semibold">
            {marketOpen ? 'FX market is open' : 'FX market is closed'}
          </span>
          <span className="text-sm text-muted-foreground">
            {marketOpen
              ? active.length > 0
                ? `Live: ${active.map((s) => s.name).join(' · ')}`
                : 'Between sessions'
              : 'Weekend break · opens Sunday 21:00 UTC'}
          </span>
        </div>
        {!marketOpen && (
          <span className="text-sm tabular-nums text-muted-foreground">
            Opens in{' '}
            {formatCountdown(Math.max(Math.round((marketOpensAt.getTime() - now.getTime()) / 1000), 0))}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TRADING_SESSIONS.map((session) => (
          <SessionCard key={session.id} session={session} now={now} />
        ))}
      </div>

      <Card className={cn(overlap.open && 'border-primary/40 bg-primary/5')}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{LONDON_NY_OVERLAP.name}</h3>
              <StatusPill open={overlap.open} />
            </div>
            <p className="text-sm text-muted-foreground">
              Highest liquidity and volatility window — the best hours to trade the majors.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {overlapLabel.opens} – {overlapLabel.closes}
            </div>
            <div className="text-xs text-muted-foreground">12:00–16:00 UTC</div>
            <div className="mt-1 text-xs tabular-nums text-muted-foreground">
              {overlap.open
                ? `Ends in ${formatCountdown(Math.round(overlap.secondsToClose ?? 0))}`
                : `Starts in ${formatCountdown(Math.round(overlap.secondsToOpen ?? 0))}`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
