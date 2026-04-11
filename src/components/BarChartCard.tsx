import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface BarChartCardProps {
  data: { label: string; value: number }[];
  goalValue?: number;
  height?: number;
  unit?: string;
  color?: string;
}

export default function BarChartCard({
  data,
  goalValue,
  height = 220,
  unit = '',
  color = '#c45c00',
}: BarChartCardProps) {
  const chartData = data.map(d => ({ label: d.label, value: d.value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          formatter={(v: number) => [`${v}${unit}`, '']}
        />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
        {goalValue !== undefined && goalValue > 0 && (
          <ReferenceLine
            y={goalValue}
            stroke="#ffd60a"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
