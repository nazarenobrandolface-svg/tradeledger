import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';

interface MiniSparklineProps {
  data: Array<{ time: number; value: number }>;
  height?: number;
  color?: string;
}

export function MiniSparkline({
  data,
  height = 40,
  color = '#6C5CE7'
}: MiniSparklineProps) {
  const chartData = data.map((d) => ({
    time: d.time,
    value: d.value,
    label: format(d.time, 'HH:mm')
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '11px'
          }}
          labelFormatter={(label: string) => label}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
