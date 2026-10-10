import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PnLDisplay } from '@/components/shared/PnLDisplay';
import { calcNetPnl, calcTotalQuantity } from '@/lib/metrics';
import type { TradeWithExecutions } from '@/types/trade';
import { useNavigate } from 'react-router-dom';

interface RecentTradesProps {
  trades: TradeWithExecutions[];
  currency?: string;
}

export function RecentTrades({ trades, currency = 'USD' }: RecentTradesProps) {
  const navigate = useNavigate();
  const recent = [...trades]
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent trades</p>
        ) : (
          <div className="space-y-2">
            {recent.map((trade) => {
              const pnl = calcNetPnl(trade.executions, trade.side);
              return (
                <div
                  key={trade.id}
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                      {trade.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {trade.side === 'long' ? 'Long' : 'Short'} · {calcTotalQuantity(trade.executions)} shares
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <PnLDisplay value={pnl} currency={currency} size="md" />
                    <div className="text-xs text-muted-foreground">
                      {trade.closedAt ? format(trade.closedAt, 'MMM d, HH:mm') : 'Open'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
