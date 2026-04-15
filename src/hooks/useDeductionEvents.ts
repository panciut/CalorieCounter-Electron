import { useState } from 'react';
import type { DeductionEvent } from '../types';

export function useDeductionEvents() {
  const [queue, setQueue] = useState<DeductionEvent[]>([]);

  const current = queue[0] ?? null;
  const next = () => setQueue(q => q.slice(1));
  const push = (events: DeductionEvent[]) => {
    if (events.length > 0) setQueue(q => [...q, ...events]);
  };

  return { current, next, push };
}
