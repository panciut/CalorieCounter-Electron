import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { linearRegression } from '../lib/macroCalc';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartCardProps {
  data: DataPoint[];
  goalValue?: number;
  height?: number;
  unit?: string;
  showTrend?: boolean;
  color?: string;
}

export default function LineChartCard({
  data,
  goalValue,
  height = 220,
  unit = '',
  showTrend = false,
  color = '#c45c00',
}: LineChartCardProps) {
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.value);
  const { slope, intercept } = linearRegression(xs, ys);

  const chartData = data.map((d, i) => ({
    label: d.label,
    value: d.value,
    trend: showTrend ? +(slope * i + intercept).toFixed(2) : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-sec)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-sec)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}${unit}`}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
          formatter={((v: unknown) => [`${Number(v)}${unit}`, '']) as never}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: 'var(--accent2)', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
        {showTrend && (
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--text-sec)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
          />
        )}
        {goalValue !== undefined && goalValue > 0 && (
          <ReferenceLine
            y={goalValue}
            stroke="var(--accent2)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
