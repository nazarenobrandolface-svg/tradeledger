import { format } from 'date-fns';
import { useEffect } from 'react';
import { X, NotebookPen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { calcNetPnl, calcTradeOutcome } from '@/lib/metrics';
import type { TradeWithExecutions } from '@/types/trade';
import { useNavigate } from 'react-router-dom';
import { useNotesForDate } from '@/hooks/useRepositories';

interface DayDetailDrawerProps {
  date: string;
  trades: TradeWithExecutions[];
  currency?: string;
  onClose: () => void;
}

export function DayDetailDrawer({ date, trades, currency = 'USD', onClose }: DayDetailDrawerProps) {
  const navigate = useNavigate();
  const dayNotes = useNotesForDate(date);
  const pnls = trades.map((t) => calcNetPnl(t.executions, t.side));
  const totalPnl = pnls.reduce((s, p) => s + p, 0);
  const winners = trades.filter((t) => calcTradeOutcome(t.executions) === 'win').length;
  const losers = trades.filter((t) => calcTradeOutcome(t.executions) === 'loss').length;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full w-full max-w-md animate-in slide-in-from-right bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">{format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-65px)] overflow-y-auto p-4">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Net P&L</span>
                <PnLDisplay value={totalPnl} currency={currency} size="lg" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold">{trades.length}</div>
                  <div className="text-xs text-muted-foreground">Trades</div>
                </div>
                <div>
                  <div className="font-semibold text-profit">{winners}</div>
                  <div className="text-xs text-muted-foreground">Winners</div>
                </div>
                <div>
                  <div className="font-semibold text-loss">{losers}</div>
                  <div className="text-xs text-muted-foreground">Losers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {trades.map((trade) => {
              const pnl = calcNetPnl(trade.executions, trade.side);
              return (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                >
                  <div>
                    <div className="text-sm font-medium">{trade.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {trade.side === 'long' ? 'Long' : 'Short'} ·{' '}
                      {trade.closedAt ? format(trade.closedAt, 'HH:mm') : ''}
                    </div>
                  </div>
                  <PnLDisplay value={pnl} currency={currency} size="sm" />
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium">Linked notes</h3>
            {dayNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes linked to this day yet.
              </p>
            ) : (
              <div className="space-y-2">
                {dayNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => navigate(`/notebook?note=${note.id}`)}
                    className="flex w-full items-start gap-2 rounded-lg border p-3 text-left hover:bg-muted/50"
                  >
                    <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{note.title || 'Untitled'}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
                          'Empty note'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
