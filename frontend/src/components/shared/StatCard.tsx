import { Card, CardContent } from '@/components/ui/card';
import { InfoTooltip } from './InfoTooltip';
import { PnLDisplay } from './PnLDisplay';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  tooltip?: string;
  isPnl?: boolean;
  currency?: string;
  change?: number;
  icon?: ReactNode;
  gauge?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  tooltip,
  isPnl = false,
  currency,
  icon,
  gauge,
  className
}: StatCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-card-hover', className)}>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            {tooltip && <InfoTooltip content={tooltip} />}
          </div>
          {isPnl && typeof value === 'number' ? (
            <PnLDisplay
              value={value}
              currency={currency}
              size="lg"
              className="block shrink truncate"
            />
          ) : (
            <div className="truncate text-2xl font-bold">{value}</div>
          )}
        </div>
        {(gauge || icon) && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">{gauge ?? icon}</div>
        )}
      </CardContent>
    </Card>
  );
}
