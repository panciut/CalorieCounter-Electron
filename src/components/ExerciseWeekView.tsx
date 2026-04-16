import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import PlanPickerModal from './PlanPickerModal';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import { today, getThisMonday, addDays, formatShortDate } from '../lib/dateUtil';
import type { WorkoutScheduleDay, WorkoutScheduleEntry, WorkoutPlan } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_STYLES: Record<string, string> = {
  planned:  'border-l-4 border-l-accent bg-accent/5',
  done:     'border-l-4 border-l-green-500 bg-green-500/5',
  skipped:  'border-l-4 border-l-text-sec/40 opacity-60',
  rest:     'border-l-4 border-l-border bg-bg',
};

export default function ExerciseWeekView() {
  const { t } = useT();
  const { showToast } = useToast();

  const [weekStart, setWeekStart] = useState(getThisMonday());
  const [days, setDays]           = useState<WorkoutScheduleDay[]>([]);
  const [plans, setPlans]         = useState<WorkoutPlan[]>([]);
  const [planPickerDay, setPlanPickerDay] = useState<string | null>(null);

  // DnD state for rescheduling
  const dragEntry = useRef<WorkoutScheduleEntry | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  useEffect(() => {
    api.workoutPlans.getAll().then(setPlans);
  }, []);

  useEffect(() => { load(); }, [weekStart]);

  async function load() {
    setDays(await api.workoutSchedule.getWeek(weekStart));
  }

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)); }
  function thisWeek() { setWeekStart(getThisMonday()); }

  async function assignPlan(plan: WorkoutPlan) {
    if (!planPickerDay) return;
    await api.workoutSchedule.assign({ date: planPickerDay, plan_id: plan.id });
    setPlanPickerDay(null);
    showToast(t('common.saved'));
    load();
  }

  async function setRest(date: string) {
    await api.workoutSchedule.setRest(date);
    load();
  }

  async function setStatus(entry: WorkoutScheduleEntry, status: string) {
    await api.workoutSchedule.setStatus({ id: entry.id, status });
    load();
  }

  async function clearEntry(entry: WorkoutScheduleEntry) {
    await api.workoutSchedule.clear(entry.id);
    load();
  }

  // DnD handlers
  function handleDragStart(entry: WorkoutScheduleEntry) {
    dragEntry.current = entry;
  }

  function handleDragOver(e: React.DragEvent, date: string) {
    e.preventDefault();
    setDragOverDate(date);
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  async function handleDrop(toDate: string) {
    const from = dragEntry.current;
    dragEntry.current = null;
    setDragOverDate(null);
    if (!from || from.date === toDate) return;

    // Find if there's an entry on the target date to swap
    const targetDay = days.find(d => d.date === toDate);
    const targetEntries = targetDay?.entries ?? [];

    if (targetEntries.length > 0) {
      // Swap first entry on each day
      await api.workoutSchedule.swap({ idA: from.id, idB: targetEntries[0].id });
    } else {
      await api.workoutSchedule.move({ id: from.id, toDate });
    }
    showToast(t('common.saved'));
    load();
  }

  const weekEnd = addDays(weekStart, 6);
  const isThisWeek = weekStart === getThisMonday();
  const todayStr = today();

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={prevWeek} className="text-text-sec hover:text-text cursor-pointer px-2 py-1 rounded border border-border hover:border-accent transition-colors text-sm">‹</button>
        <div className="flex-1 text-sm font-medium text-text text-center">
          {formatShortDate(weekStart)} — {formatShortDate(weekEnd)}
        </div>
        <button onClick={nextWeek} className="text-text-sec hover:text-text cursor-pointer px-2 py-1 rounded border border-border hover:border-accent transition-colors text-sm">›</button>
        {!isThisWeek && (
          <button onClick={thisWeek} className="text-xs px-3 py-1 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">
            {t('exercise.week.title')}
          </button>
        )}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = day.date === todayStr;
          const isDragOver = dragOverDate === day.date;
          return (
            <div
              key={day.date}
              onDragOver={e => handleDragOver(e, day.date)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(day.date)}
              className={`flex flex-col gap-1.5 min-h-36 rounded-xl border transition-all ${
                isDragOver ? 'ring-2 ring-accent border-accent' : 'border-border'
              } ${isToday ? 'bg-accent/3' : 'bg-card'}`}
            >
              {/* Day header */}
              <div className={`px-2 pt-2 flex items-center justify-between`}>
                <span className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-text-sec'}`}>
                  {DAY_NAMES[i]}
                </span>
                <span className={`text-xs tabular-nums ${isToday ? 'text-accent font-medium' : 'text-text-sec/60'}`}>
                  {formatShortDate(day.date)}
                </span>
              </div>

              {/* Entries */}
              <div className="flex flex-col gap-1 px-1.5 flex-1">
                {day.entries.map(entry => (
                  <DayEntry
                    key={entry.id}
                    entry={entry}
                    statusStyles={STATUS_STYLES}
                    onDragStart={() => handleDragStart(entry)}
                    onSetStatus={status => setStatus(entry, status)}
                    onClear={() => clearEntry(entry)}
                    t={t}
                  />
                ))}

                {day.exercises_logged > 0 && day.entries.length === 0 && (
                  <div className="text-[10px] text-text-sec px-1">
                    {day.exercises_logged} exercise{day.exercises_logged !== 1 ? 's' : ''} logged
                  </div>
                )}
              </div>

              {/* Day actions */}
              <div className="flex gap-1 px-1.5 pb-1.5 flex-wrap">
                <button
                  onClick={() => setPlanPickerDay(day.date)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer transition-colors"
                >
                  + Plan
                </button>
                <button
                  onClick={() => setRest(day.date)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-card-hover text-text-sec hover:text-text cursor-pointer transition-colors"
                >
                  Rest
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-text-sec">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-accent/30 inline-block" />{t('exercise.week.planned')}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500/30 inline-block" />{t('exercise.week.done')}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-text-sec/20 inline-block" />{t('exercise.week.skipped')}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-border inline-block" />{t('exercise.week.rest')}</span>
      </div>

      {/* Plan picker */}
      {planPickerDay && (
        <PlanPickerModal
          plans={plans}
          onSelect={assignPlan}
          onClose={() => setPlanPickerDay(null)}
        />
      )}
    </div>
  );
}

// ─── DayEntry defined at module level ────────────────────────────────────────

interface DayEntryProps {
  entry: WorkoutScheduleEntry;
  statusStyles: Record<string, string>;
  onDragStart: () => void;
  onSetStatus: (status: string) => void;
  onClear: () => void;
  t: ReturnType<typeof useT>['t'];
}

function DayEntry({ entry, statusStyles, onDragStart, onSetStatus, onClear, t }: DayEntryProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const style = statusStyles[entry.status] ?? 'border-l-4 border-l-border';

  return (
    <div
      draggable={entry.status !== 'rest'}
      onDragStart={onDragStart}
      className={`rounded-lg p-1.5 text-[10px] relative cursor-grab ${style}`}
    >
      <div className="font-medium text-text truncate">
        {entry.status === 'rest' ? t('exercise.week.rest') : (entry.plan_name ?? 'Workout')}
      </div>
      <div className="text-text-sec capitalize">{t(`exercise.week.${entry.status}` as Parameters<typeof t>[0])}</div>

      {/* Quick actions */}
      <div className="flex gap-0.5 mt-1">
        {entry.status !== 'done' && entry.status !== 'rest' && (
          <button onClick={() => onSetStatus('done')} className="text-green-400 hover:text-green-300 cursor-pointer leading-none">✓</button>
        )}
        {entry.status !== 'skipped' && entry.status !== 'rest' && (
          <button onClick={() => onSetStatus('skipped')} className="text-text-sec hover:text-text cursor-pointer leading-none">–</button>
        )}
        <button onClick={onClear} className="text-text-sec/60 hover:text-red cursor-pointer leading-none ml-auto">✕</button>
      </div>
    </div>
  );
}
