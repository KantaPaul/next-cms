'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

/* ---------- Pure functions for testing and calculation ---------- */

export type TimeRemaining = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
};

export function calculateTimeRemaining(
  targetTimeMs: number,
  nowMs: number
): TimeRemaining {
  const total = Math.max(0, targetTimeMs - nowMs);
  const isExpired = total <= 0;

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    isExpired,
  };
}

export function getEvergreenTarget(
  key: string,
  durationMs: number,
  nowMs: number,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
): number {
  if (!storage) return nowMs + durationMs;
  const storageKey = `countdown_${key}`;
  const existing = storage.getItem(storageKey);
  if (existing) {
    const parsed = Number.parseInt(existing, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const newTarget = nowMs + durationMs;
  try {
    storage.setItem(storageKey, String(newTarget));
  } catch {
    // Ignore quota or disabled storage
  }
  return newTarget;
}

/* ---------- Countdown Component ---------- */

export type CountdownProps = WithSection & {
  type?: 'due_date' | 'evergreen';
  dueDate?: string; // ISO string e.g. '2026-12-31T23:59:59'
  evergreenHours?: number;
  evergreenMinutes?: number;
  evergreenKey?: string;
  labels?: {
    days?: string;
    hours?: string;
    minutes?: string;
    seconds?: string;
  };
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  expireAction?: 'hide' | 'message' | 'redirect';
  expireMessage?: string;
  redirectUrl?: string;
  alignment?: 'left' | 'center' | 'right';
};

export function Countdown(p: CountdownProps) {
  const type = p.type ?? 'due_date';
  const showDays = p.showDays ?? true;
  const showHours = p.showHours ?? true;
  const showMinutes = p.showMinutes ?? true;
  const showSeconds = p.showSeconds ?? true;
  const align = p.alignment ?? 'center';
  const expireAction = p.expireAction ?? 'message';
  const expireMessage = p.expireMessage || 'This offer has expired.';

  const labels = {
    days: p.labels?.days || 'Days',
    hours: p.labels?.hours || 'Hours',
    minutes: p.labels?.minutes || 'Minutes',
    seconds: p.labels?.seconds || 'Seconds',
  };

  const [targetTime, setTargetTime] = useState<number>(() => {
    if (type === 'due_date') {
      return p.dueDate ? new Date(p.dueDate).getTime() : Date.now() + 86400000;
    }
    const hours = p.evergreenHours ?? 24;
    const minutes = p.evergreenMinutes ?? 0;
    const dur = (hours * 3600 + minutes * 60) * 1000;
    return Date.now() + dur;
  });

  // Null until mounted: the server and the first client render must print the same text.
  const [remaining, setRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let target = targetTime;
    if (type === 'evergreen') {
      const hours = p.evergreenHours ?? 24;
      const minutes = p.evergreenMinutes ?? 0;
      const dur = (hours * 3600 + minutes * 60) * 1000;
      const key = p.evergreenKey || 'default_deal';
      target = getEvergreenTarget(key, dur, Date.now(), window.localStorage);
      setTargetTime(target);
    } else if (p.dueDate) {
      target = new Date(p.dueDate).getTime();
      setTargetTime(target);
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const rem = calculateTimeRemaining(target, Date.now());
      setRemaining(rem);
      if (rem.isExpired) {
        if (interval) clearInterval(interval);
        if (expireAction === 'redirect' && p.redirectUrl && !p.editing) {
          window.location.href = p.redirectUrl;
        }
        return false;
      }
      return true;
    };
    if (tick()) interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [
    type,
    p.dueDate,
    p.evergreenHours,
    p.evergreenMinutes,
    p.evergreenKey,
    expireAction,
    p.redirectUrl,
    p.editing,
  ]);

  const boxEl = el(p, 'box', 'flex flex-col items-center justify-center rounded-xl s-surface-alt p-4 border s-border min-w-[4.5rem]');
  const numEl = el(p, 'number', 'text-3xl md:text-4xl font-extrabold tracking-tight font-mono text-[var(--site-fg)]');
  const labelEl = el(p, 'label', 'mt-1 text-xs uppercase tracking-wider s-muted font-semibold');

  if (remaining?.isExpired) {
    if (expireAction === 'hide') {
      if (p.editing) {
        return (
          <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
            <div className="p-4 border border-dashed rounded text-center text-sm s-muted">
              [Countdown Expired - Hidden on public site]
            </div>
          </Section>
        );
      }
      return null;
    }
    if (expireAction === 'message') {
      return (
        <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
          <div
            className={cn(
              'w-full text-center py-4 font-medium s-muted',
              el(p, 'expiredMessage').className
            )}
            style={el(p, 'expiredMessage').style}
          >
            {expireMessage}
          </div>
        </Section>
      );
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        className={cn(
          'flex flex-wrap gap-3 md:gap-4 w-full',
          align === 'center'
            ? 'justify-center'
            : align === 'right'
              ? 'justify-end'
              : 'justify-start'
        )}
      >
        {showDays && (
          <div className={boxEl.className} style={boxEl.style}>
            <span className={numEl.className} style={numEl.style}>
              {remaining ? pad(remaining.days) : '--'}
            </span>
            <span className={labelEl.className} style={labelEl.style}>
              {labels.days}
            </span>
          </div>
        )}
        {showHours && (
          <div className={boxEl.className} style={boxEl.style}>
            <span className={numEl.className} style={numEl.style}>
              {remaining ? pad(remaining.hours) : '--'}
            </span>
            <span className={labelEl.className} style={labelEl.style}>
              {labels.hours}
            </span>
          </div>
        )}
        {showMinutes && (
          <div className={boxEl.className} style={boxEl.style}>
            <span className={numEl.className} style={numEl.style}>
              {remaining ? pad(remaining.minutes) : '--'}
            </span>
            <span className={labelEl.className} style={labelEl.style}>
              {labels.minutes}
            </span>
          </div>
        )}
        {showSeconds && (
          <div className={boxEl.className} style={boxEl.style}>
            <span className={numEl.className} style={numEl.style}>
              {remaining ? pad(remaining.seconds) : '--'}
            </span>
            <span className={labelEl.className} style={labelEl.style}>
              {labels.seconds}
            </span>
          </div>
        )}
      </div>
    </Section>
  );
}
