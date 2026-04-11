import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

const COLORS = ['#5e9cf5', '#30d158', '#e07020'];
const LABELS = ['Protein', 'Carbs', 'Fat'];

interface ActiveShapeProps {
  cx: number; cy: number;
  innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number;
  fill: string;
  payload: { name: string; value: number };
  percent: number;
}

function ActiveShape(props: ActiveShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

export default function MacroChart({ protein, carbs, fat, calories }: MacroChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const data = [
    { name: 'Protein', value: Math.round(protein * 4) },
    { name: 'Carbs',   value: Math.round(carbs * 4) },
    { name: 'Fat',     value: Math.round(fat * 9) },
  ].filter(d => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0;

  const activeItem = activeIdx !== null ? data[activeIdx] : null;
  const activePct  = activeItem && total > 0 ? Math.round(activeItem.value / total * 100) : null;

  return (
    <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
      <ResponsiveContainer width={150} height={150}>
        <PieChart>
          <Pie
            data={empty ? [{ name: 'empty', value: 1 }] : data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={empty ? 0 : 2}
            activeIndex={activeIdx ?? undefined}
            activeShape={!empty ? (props: unknown) => <ActiveShape {...(props as ActiveShapeProps)} /> : undefined}
            onMouseEnter={(_, index) => !empty && setActiveIdx(index)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {empty
              ? <Cell fill="var(--border)" />
              : data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)
            }
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center label — shows active macro or total kcal */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {activeItem && activePct !== null ? (
          <>
            <span className="text-base font-bold tabular-nums" style={{ color: COLORS[data.indexOf(activeItem)] }}>
              {activePct}%
            </span>
            <span className="text-xs font-medium" style={{ color: COLORS[data.indexOf(activeItem)] }}>
              {activeItem.name}
            </span>
            <span className="text-xs text-text-sec tabular-nums">{activeItem.value} kcal</span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold text-text tabular-nums">{Math.round(calories)}</span>
            <span className="text-xs text-text-sec">kcal</span>
          </>
        )}
      </div>

      {/* Color legend dots (always visible) */}
      {!empty && activeIdx === null && (
        <div className="absolute -bottom-5 left-0 right-0 flex justify-center gap-3">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i] }} />
              <span className="text-[10px] text-text-sec">{LABELS[i]?.[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
