import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, formatDistanceToNow, isSameDay } from 'date-fns';
import { AlertCircle, ExternalLink, RefreshCw, Rss, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCountdown } from '@/lib/marketHours';
import { fetchFfCalendar, type FfEvent, type FfImpact } from '@/lib/ffCalendar';
import { fetchForexNews, type NewsItem } from '@/lib/newsFeed';

const IMPACT_FILTERS: FfImpact[] = ['High', 'Medium', 'Low', 'Holiday'];

const IMPACT_STYLES: Record<FfImpact, string> = {
  High: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Low: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Holiday: 'border-border bg-muted/60 text-muted-foreground'
};

function ImpactBadge({ impact }: { impact: FfImpact }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs font-semibold',
        IMPACT_STYLES[impact]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {impact}
    </span>
  );
}

type DayFilter = 'today' | 'tomorrow' | 'week';

function FeedMessage({
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-destructive/60" />
          <h3 className="text-lg font-semibold">Couldn&apos;t load the feed</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <SearchX className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">{emptyTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </CardContent>
    </Card>
  );
}

export function NewsPage() {
  const [now, setNow] = useState(() => new Date());

  const [events, setEvents] = useState<FfEvent[] | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);

  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  const [impacts, setImpacts] = useState<Set<FfImpact>>(() => new Set(IMPACT_FILTERS));
  const [currency, setCurrency] = useState('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('week');

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    setCalendarError(null);
    try {
      setEvents(await fetchFfCalendar());
    } catch (err) {
      setCalendarError(err instanceof Error ? err.message : 'Calendar feed unavailable');
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      setNews(await fetchForexNews());
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : 'News feed unavailable');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
    void loadNews();
  }, [loadCalendar, loadNews]);

  const currencies = useMemo(
    () => [...new Set((events ?? []).map((e) => e.currency))].sort(),
    [events]
  );

  const filteredEvents = useMemo(() => {
    const list = events ?? [];
    const tomorrow = addDays(now, 1);
    return list
      .filter((event) => {
        if (!impacts.has(event.impact)) return false;
        if (currency !== 'all' && event.currency !== currency) return false;
        const date = new Date(event.timestamp);
        if (dayFilter === 'today') return isSameDay(date, now);
        if (dayFilter === 'tomorrow') return isSameDay(date, tomorrow);
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events, impacts, currency, dayFilter, now]);

  const nextEvent = filteredEvents.find((event) => event.timestamp > now.getTime());

  const toggleImpact = (impact: FfImpact) => {
    setImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      return next;
    });
  };

  const calendarEmpty = !calendarLoading && !calendarError && filteredEvents.length === 0;
  const newsEmpty = !newsLoading && !newsError && (news ?? []).length === 0;

  let previousDay: Date | null = null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">News</h1>
        <p className="text-sm text-muted-foreground">
          Economic calendar (Forex Factory, this week) and live forex headlines · times in your
          local timezone
        </p>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="news">Headlines</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {IMPACT_FILTERS.map((impact) => (
              <Button
                key={impact}
                size="sm"
                variant={impacts.has(impact) ? 'default' : 'outline'}
                className="h-8"
                onClick={() => toggleImpact(impact)}
              >
                {impact}
              </Button>
            ))}

            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 w-[110px] text-sm">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All currencies</SelectItem>
                {currencies.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dayFilter} onValueChange={(v) => setDayFilter(v as DayFilter)}>
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Refresh calendar"
              onClick={() => void loadCalendar()}
            >
              <RefreshCw className={cn('h-4 w-4', calendarLoading && 'animate-spin')} />
            </Button>

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {nextEvent && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                <span className="truncate text-sm font-semibold">
                  Next: {nextEvent.title}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {nextEvent.currency}
                </span>
                <ImpactBadge impact={nextEvent.impact} />
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                in {formatCountdown(Math.max(Math.round((nextEvent.timestamp - now.getTime()) / 1000), 0))}
              </span>
            </div>
          )}

          {calendarError || calendarLoading || calendarEmpty ? (
            <FeedMessage
              loading={calendarLoading}
              error={calendarError}
              onRetry={() => void loadCalendar()}
              emptyTitle="No events match your filters"
              emptyDescription="Try widening the impact, currency, or day filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Time</TableHead>
                    <TableHead className="w-16">Cur</TableHead>
                    <TableHead className="w-24">Impact</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-24 text-right">Forecast</TableHead>
                    <TableHead className="w-24 text-right">Previous</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const date = new Date(event.timestamp);
                    const showDayHeader = !previousDay || !isSameDay(date, previousDay);
                    previousDay = date;
                    const isPast = event.timestamp <= now.getTime();
                    const isNext = nextEvent?.id === event.id;
                    return (
                      <Fragment key={event.id}>
                        {showDayHeader && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={6}
                              className="bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              {format(date, 'EEEE, MMM d')}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow
                          className={cn(
                            isPast && 'text-muted-foreground',
                            isNext && 'bg-primary/5'
                          )}
                        >
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {format(date, 'HH:mm')}
                          </TableCell>
                          <TableCell>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                              {event.currency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ImpactBadge impact={event.impact} />
                          </TableCell>
                          <TableCell>
                            <span className={cn('font-medium', isNext && 'text-foreground')}>
                              {event.title}
                            </span>
                            {event.url && (
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 inline-block align-middle text-muted-foreground hover:text-foreground"
                                aria-label="Open on Forex Factory"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {event.forecast || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {event.previous || '—'}
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {news?.length ? `${news.length} latest headlines` : ''}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Refresh headlines"
              onClick={() => void loadNews()}
            >
              <RefreshCw className={cn('h-4 w-4', newsLoading && 'animate-spin')} />
            </Button>
          </div>

          {newsError || newsLoading || newsEmpty ? (
            <FeedMessage
              loading={newsLoading}
              error={newsError}
              onRetry={() => void loadNews()}
              emptyTitle="No headlines right now"
              emptyDescription="Check back in a few minutes for the latest forex news."
            />
          ) : (
            <div className="space-y-2">
              {(news ?? []).map((item) => (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {item.source && (
                        <span className="inline-flex items-center gap-1">
                          <Rss className="h-3 w-3" />
                          {item.source}
                        </span>
                      )}
                      {item.publishedAt > 0 && (
                        <span>
                          {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
