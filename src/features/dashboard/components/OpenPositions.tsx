import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { Trade } from '@/types/trade';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface OpenPositionsProps {
  trades: Trade[];
}

export function OpenPositions({ trades }: OpenPositionsProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No open positions</p>
        ) : (
          <div className="space-y-2">
            {trades.slice(0, 8).map((trade) => (
              <div
                key={trade.id}
                onClick={() => navigate(`/trades/${trade.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      trade.side === 'long' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                    }`}
                  >
                    {trade.side === 'long' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{trade.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {trade.side === 'long' ? 'Long' : 'Short'} · Opened{' '}
                      {format(trade.openedAt, 'MMM d')}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Open
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
