import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface EquityAreaChartProps {
  data: Array<{ date: number; value: number }>;
  height?: number;
  currency?: string;
}

export function EquityAreaChart({ data, height = 300, currency = 'USD' }: EquityAreaChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    value: d.value,
    label: format(d.date, 'MMM d')
  }));

  const isPositive = (chartData[chartData.length - 1]?.value ?? 0) >= 0;
  const strokeColor = isPositive ? '#16C784' : '#EA3943';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCurrency(v, currency)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: number | string) => [formatCurrency(Number(value), currency), 'Equity']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#equityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
