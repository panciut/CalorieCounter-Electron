import { getBarColor } from '../lib/macroCalc';
import type { Settings } from '../types';

export interface BarDef {
  id: string;
  label: string;
  actual: number;
  min: number;
  max: number;
  rec: number;
  unit: string;
}

interface MacroBarsProps {
  bars: BarDef[];
  settings: Pick<Settings, 'tol_1' | 'tol_2' | 'tol_3'>;
}

const SCALE = 1.30; // 30% headroom past max for overflow visibility

export default function MacroBars({ bars, settings }: MacroBarsProps) {
  return (
    <div className="flex flex-col gap-3 flex-1">
      {bars.map(({ id, label, actual, min, max, rec, unit }) => {
        const scale     = max * SCALE;
        const fillPct   = scale ? Math.min(100, actual / scale * 100) : 0;
        const minPct    = scale && min ? min  / scale * 100 : null;
        const recPct    = scale && rec ? rec  / scale * 100 : null;
        const maxPct    = scale        ? 100  / SCALE       : null;
        const colorCls  = getBarColor(actual, min, max, settings);

        return (
          <div key={id} className="flex items-center gap-3">
            <span className="text-xs text-text-sec uppercase tracking-wider min-w-[72px] shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded-sm relative" style={{ background: 'var(--border)' }}>
              {/* Fill bar */}
              <div
                className={`h-full rounded-sm transition-[width] duration-400 ${colorCls}`}
                style={{ width: `${fillPct}%`, overflow: 'hidden' }}
              />
              {/* Min tick — green */}
              {minPct !== null && (
                <div className="absolute top-[-3px] w-0.5 h-3 rounded-sm pointer-events-none opacity-55"
                  style={{ left: `${minPct}%`, background: 'var(--green)' }} />
              )}
              {/* Rec tick — white */}
              {recPct !== null && (
                <div className="absolute top-[-2px] w-0.5 h-2.5 rounded-sm pointer-events-none opacity-50"
                  style={{ left: `${recPct}%`, background: 'var(--text-sec)' }} />
              )}
              {/* Max tick — red */}
              {maxPct !== null && (
                <div className="absolute top-[-4px] w-0.5 h-3.5 rounded-sm pointer-events-none opacity-60"
                  style={{ left: `${maxPct}%`, background: 'var(--red)' }} />
              )}
            </div>
            <span className="text-xs text-text-sec tabular-nums min-w-[130px] text-right">
              {actual}{unit} · {Math.round(min)}–{Math.round(max)}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
