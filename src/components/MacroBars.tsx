import { useState, useRef } from 'react';
import { getBarColor } from '../lib/macroCalc';
import type { Settings, LogEntry } from '../types';
import MacroBreakdownTooltip from './MacroBreakdownTooltip';

export interface BarDef {
  id: string;
  label: string;
  actual: number;
  planned?: number;
  min: number;
  max: number;
  rec: number;
  unit: string;
}

interface MacroBarsProps {
  bars: BarDef[];
  settings: Pick<Settings, 'tol_1' | 'tol_2' | 'tol_3'>;
  entries?: LogEntry[];
}

const SCALE = 1.30;

export default function MacroBars({ bars, settings, entries = [] }: MacroBarsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function handleMouseEnter(id: string) {
    const el = rowRefs.current[id];
    if (el) setAnchorRect(el.getBoundingClientRect());
    setHoveredId(id);
  }

  function handleMouseLeave() {
    setHoveredId(null);
    setAnchorRect(null);
  }

  return (
    <div className="flex flex-col gap-3 flex-1">
      {bars.map(({ id, label, actual, planned = 0, min, max, rec, unit }) => {
        const scale       = max * SCALE;
        const fillPct     = scale ? Math.min(100, actual / scale * 100) : 0;
        const plannedPct  = scale && planned > 0
          ? Math.min(100 - fillPct, planned / scale * 100)
          : 0;
        const minPct      = scale && min ? min  / scale * 100 : null;
        const recPct      = scale && rec ? rec  / scale * 100 : null;
        const maxPct      = scale        ? 100  / SCALE       : null;
        const colorCls    = getBarColor(actual + planned, min, max, settings);
        const isHovered   = hoveredId === id;

        return (
          <div
            key={id}
            ref={el => { rowRefs.current[id] = el; }}
            className="flex items-center gap-3 cursor-default"
            onMouseEnter={() => handleMouseEnter(id)}
            onMouseLeave={handleMouseLeave}
          >
            <span className="text-xs text-text-sec uppercase tracking-wider w-[72px] shrink-0">{label}</span>
            <div
              className={`flex-1 h-1.5 rounded-sm relative transition-[height] duration-150 ${isHovered ? 'h-2' : ''}`}
              style={{ background: 'var(--border)' }}
            >
              <div
                className={`absolute top-0 left-0 h-full rounded-sm transition-[width] duration-400 ${colorCls}`}
                style={{ width: `${fillPct}%` }}
              />
              {plannedPct > 0 && (
                <div
                  className={`absolute top-0 h-full rounded-sm transition-[width,left] duration-400 ${colorCls}`}
                  style={{
                    left: `${fillPct}%`,
                    width: `${plannedPct}%`,
                    opacity: 0.35,
                    backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0 3px, transparent 3px 6px)',
                  }}
                />
              )}
              {minPct !== null && (
                <div className="absolute top-[-3px] w-0.5 h-3 rounded-sm pointer-events-none opacity-55"
                  style={{ left: `${minPct}%`, background: 'var(--green)' }} />
              )}
              {recPct !== null && (
                <div className="absolute top-[-2px] w-0.5 h-2.5 rounded-sm pointer-events-none opacity-50"
                  style={{ left: `${recPct}%`, background: 'var(--text-sec)' }} />
              )}
              {maxPct !== null && (
                <div className="absolute top-[-4px] w-0.5 h-3.5 rounded-sm pointer-events-none opacity-60"
                  style={{ left: `${maxPct}%`, background: 'var(--red)' }} />
              )}
            </div>
            <span className="text-xs text-text-sec tabular-nums w-[280px] shrink-0 text-left whitespace-nowrap">
              <span className="text-text">{actual}</span>
              {planned > 0 && <span className="text-accent">+{Math.round(planned)}</span>}
              {planned > 0 && <span className="text-text"> = {Math.round(actual + planned)}</span>}
              {unit}
              {rec > 0 && <span className="text-text-sec/70"> · {Math.round(rec)}{unit}</span>}
              <span className="text-text-sec/70"> · {Math.round(min)}–{Math.round(max)}{unit}</span>
            </span>

            {isHovered && anchorRect && entries.length > 0 && (
              <MacroBreakdownTooltip id={id} label={label} actual={actual} planned={planned} unit={unit} entries={entries} anchorRect={anchorRect} />
            )}
          </div>
        );
      })}
    </div>
  );
}
