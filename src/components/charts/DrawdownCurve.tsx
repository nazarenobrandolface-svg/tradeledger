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

interface DrawdownCurveProps {
  data: Array<{ date: number; drawdown: number }>;
  height?: number;
}

export function DrawdownCurve({ data, height = 250 }: DrawdownCurveProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(d.date, 'MMM d')
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EA3943" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EA3943" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: number | string) => [
            `$${Number(value).toFixed(2)}`,
            'Drawdown'
          ]}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="#EA3943"
          strokeWidth={2}
          fill="url(#ddGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
