import { formatPnl, formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface PnLDisplayProps {
  value: number;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
}

const sizeClasses = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-xl font-bold',
  xl: 'text-3xl font-bold'
};

export function PnLDisplay({
  value,
  currency = 'USD',
  className,
  size = 'md',
  showSign = true
}: PnLDisplayProps) {
  const color = value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-muted-foreground';
  const text = showSign ? formatPnl(value, currency) : formatCurrency(Math.abs(value), currency);

  return (
    <span className={cn('shrink-0 whitespace-nowrap', sizeClasses[size], color, className)}>
      {text}
    </span>
  );
}
