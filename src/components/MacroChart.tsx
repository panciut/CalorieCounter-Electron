import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  plannedProtein?: number;
  plannedCarbs?: number;
  plannedFat?: number;
  plannedCalories?: number;
  plannedLabel?: string;
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

export default function MacroChart({
  protein, carbs, fat, calories,
  plannedProtein = 0, plannedCarbs = 0, plannedFat = 0, plannedCalories = 0,
  plannedLabel = 'planned',
}: MacroChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const data = [
    { name: 'Protein', value: Math.round(protein * 4) },
    { name: 'Carbs',   value: Math.round(carbs * 4) },
    { name: 'Fat',     value: Math.round(fat * 9) },
  ].filter(d => d.value > 0);

  const plannedData = [
    { name: 'Protein', value: Math.round(plannedProtein * 4) },
    { name: 'Carbs',   value: Math.round(plannedCarbs * 4) },
    { name: 'Fat',     value: Math.round(plannedFat * 9) },
  ].filter(d => d.value > 0);

  const hasPlanned = plannedData.length > 0;

  const total = data.reduce((s, d) => s + d.value, 0);
  const empty = total === 0 && !hasPlanned;

  const activeItem = activeIdx !== null ? data[activeIdx] : null;
  const activePct  = activeItem && total > 0 ? Math.round(activeItem.value / total * 100) : null;

  return (
    <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
      <ResponsiveContainer width={150} height={150}>
        <PieChart>
          <Pie
            data={total === 0 ? [{ name: 'empty', value: 1 }] : data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={68}
            dataKey="value"
            strokeWidth={0}
            paddingAngle={total === 0 ? 0 : 2}
            activeIndex={activeIdx ?? undefined}
            activeShape={total > 0 ? (props: unknown) => <ActiveShape {...(props as ActiveShapeProps)} /> : undefined}
            onMouseEnter={(_, index) => total > 0 && setActiveIdx(index)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            {total === 0
              ? <Cell fill="var(--border)" />
              : data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)
            }
          </Pie>
          {/* Planned outer ring — translucent so it reads as "on top of" actual */}
          {hasPlanned && (
            <Pie
              data={plannedData}
              cx="50%"
              cy="50%"
              innerRadius={71}
              outerRadius={76}
              dataKey="value"
              strokeWidth={0}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {plannedData.map((d) => {
                const idx = ['Protein', 'Carbs', 'Fat'].indexOf(d.name);
                return <Cell key={d.name} fill={COLORS[idx]} fillOpacity={0.4} />;
              })}
            </Pie>
          )}
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
            {plannedCalories > 0 && (
              <span className="text-[10px] text-accent tabular-nums mt-0.5">+{Math.round(plannedCalories)} {plannedLabel}</span>
            )}
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
