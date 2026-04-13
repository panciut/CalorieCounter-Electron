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
  data: { label: string; value: number; planned?: number }[];
  goalValue?: number;
  height?: number;
  unit?: string;
  color?: string;
  yDomain?: [number | string, number | string];
  onBarClick?: (index: number) => void;
}

export default function BarChartCard({
  data,
  goalValue,
  height = 220,
  unit = '',
  color = '#c45c00',
  yDomain,
  onBarClick,
}: BarChartCardProps) {
  const chartData = data.map(d => ({ label: d.label, value: d.value, planned: d.planned ?? 0 }));
  const hasPlanned = chartData.some(d => d.planned > 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <pattern id="planned-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={color} fillOpacity="0.25" />
            <rect width="3" height="6" fill={color} fillOpacity="0.65" />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-sec)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-sec)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}${unit}`}
          domain={yDomain}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
          cursor={{ fill: 'var(--border)' }}
          formatter={(v: number, name: string) => [`${v}${unit}`, name === 'planned' ? 'planned' : 'logged']}
        />
        <Bar dataKey="value" stackId="a" fill={color} radius={hasPlanned ? [0, 0, 0, 0] : [3, 3, 0, 0]} maxBarSize={48} onClick={onBarClick ? (_, index) => onBarClick(index) : undefined} style={onBarClick ? { cursor: 'pointer' } : undefined} />
        {hasPlanned && (
          <Bar dataKey="planned" stackId="a" fill="url(#planned-stripes)" stroke={color} strokeWidth={1} strokeOpacity={0.6} radius={[3, 3, 0, 0]} maxBarSize={48} />
        )}
        {goalValue !== undefined && goalValue > 0 && (
          <ReferenceLine
            y={goalValue}
            stroke="var(--yellow)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
