'use client';

import { useEffect, useRef, useState } from 'react';
import { saveDraft } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Debounced draft autosave. `value` must be referentially stable between
 * renders when nothing changed (pass a serialised string or memoised object).
 */
export function useAutosave({
  pageId,
  value,
  enabled,
  delay = 3000,
  toPayload,
}: {
  pageId?: string;
  value: string;
  enabled: boolean;
  delay?: number;
  toPayload: () => { content: unknown; title?: string };
}) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastSaved = useRef(value);
  const payloadRef = useRef(toPayload);
  payloadRef.current = toPayload;

  const isDirty = value !== lastSaved.current;

  useEffect(() => {
    if (!enabled || !pageId || value === lastSaved.current) return;

    setStatus('pending');
    const timer = setTimeout(async () => {
      setStatus('saving');
      const response = await saveDraft({ id: pageId, autosave: true, ...payloadRef.current() });

      if (response && typeof response === 'object' && ('hasError' in response || 'errors' in response)) {
        setStatus('error');
        return;
      }

      lastSaved.current = value;
      setSavedAt(new Date());
      setStatus('saved');
    }, delay);

    return () => clearTimeout(timer);
  }, [value, enabled, pageId, delay]);

  /** Call after a manual save so the saved value becomes the new baseline. */
  const markSaved = (next: string) => {
    lastSaved.current = next;
    setSavedAt(new Date());
    setStatus('saved');
  };

  return { status, savedAt, isDirty, markSaved };
}

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

export function AutosaveIndicator({ status, savedAt }: { status: AutosaveStatus; savedAt: Date | null }) {
  const label = {
    idle: savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'No changes',
    pending: 'Unsaved changes',
    saving: 'Saving draft…',
    saved: `Draft saved ${savedAt?.toLocaleTimeString() ?? ''}`,
    error: 'Autosave failed',
  }[status];

  const color = {
    idle: 'bg-steel-300',
    pending: 'bg-amber-400',
    saving: 'bg-sky-400 animate-pulse',
    saved: 'bg-emerald-500',
    error: 'bg-red-500',
  }[status];

  return (
    <span className="flex items-center gap-2 text-xs text-steel-500" aria-live="polite">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
