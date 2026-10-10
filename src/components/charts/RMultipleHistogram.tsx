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

interface RMultipleHistogramProps {
  data: Array<{ rMultiple: number; count: number }>;
  height?: number;
}

export function RMultipleHistogram({ data, height = 250 }: RMultipleHistogramProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="rMultiple"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v.toFixed(1)}R`}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: number | string) => [value, 'Trades']}
          labelFormatter={(label: string) => `${Number(label).toFixed(1)}R`}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.rMultiple >= 0 ? '#16C784' : '#EA3943'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
