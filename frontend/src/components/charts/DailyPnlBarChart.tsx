import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { formatCompactCurrency, formatCurrency } from '@/lib/formatters';

interface DailyPnlBarChartProps {
  data: Array<{ date: string; netPnl: number }>;
  height?: number;
  currency?: string;
}

export function DailyPnlBarChart({ data, height = 250, currency = 'USD' }: DailyPnlBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date + 'T00:00:00'), 'MMM d')
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          width={56}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'hsl(var(--popover-foreground))'
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
          formatter={(value: number | string) => [formatCurrency(Number(value), currency), 'Net P&L']}
        />
        <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.netPnl >= 0 ? '#16C784' : '#EA3943'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
