'use client';

// React in scope: some consumers' test runners compile JSX classically.
import React, { useEffect, useRef, useState } from 'react';

export type RollDirection = 'up' | 'down';

export interface RollSlot {
  /** Stable key, counted from the right so units stay aligned. */
  key: string;
  from: string;
  to: string;
}

/**
 * Lines up the old and new strings character by character from the right,
 * so "9%" → "10%" keeps the "%" in place and only the digits roll.
 */
export function rollSlots(prev: string, next: string): RollSlot[] {
  const len = Math.max(prev.length, next.length);
  const a = prev.padStart(len, ' ');
  const b = next.padStart(len, ' ');
  const slots: RollSlot[] = [];
  for (let i = 0; i < len; i++) {
    if (b[i] === ' ' && a[i] === ' ') continue;
    slots.push({ key: String(len - i), from: a[i], to: b[i] });
  }
  // Drop leading slots that only existed in the old value.
  while (slots.length > next.length && slots[0]?.to === ' ') slots.shift();
  return slots;
}

/** Bigger numbers roll up, smaller ones roll down; text changes roll up. */
export function rollDirection(prev: string, next: string): RollDirection {
  const a = Number.parseFloat(prev);
  const b = Number.parseFloat(next);
  if (Number.isFinite(a) && Number.isFinite(b) && b < a) return 'down';
  return 'up';
}

const ROLL_MS = 220;

/**
 * What a value change does while a roll may be in flight: a new value
 * arriving inside the 220ms roll cancels the pending commit and restarts
 * the column from the last committed frame, so hold-to-repeat rolls cleanly
 * from one frame to the next instead of queueing or jumping. Equal values
 * are a no-op.
 */
export function restartRoll(
  committed: string,
  next: string
): { from: string; restart: boolean } {
  if (committed === next) return { from: committed, restart: false };
  return { from: committed, restart: true };
}

function Slot({
  from,
  to,
  direction,
  rolling,
}: {
  from: string;
  to: string;
  direction: RollDirection;
  rolling: boolean;
}) {
  if (!rolling || from === to) {
    return <span className="ne-roll-slot">{to === ' ' ? '' : to}</span>;
  }
  // Up: column [from, to] slides from 0 to -50%. Down: [to, from] slides
  // from -50% to 0.
  const column = direction === 'up' ? [from, to] : [to, from];
  return (
    <span className="ne-roll-slot">
      <span className="ne-roll-column" data-dir={direction}>
        {column.map((ch, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed two-row column
          <span key={i}>{ch === ' ' ? ' ' : ch}</span>
        ))}
      </span>
    </span>
  );
}

/**
 * A number (or short label like "100%") whose changed characters roll
 * vertically. Screen readers get the plain value. The roll is CSS-timed, so
 * reduced motion and `data-ne-motion="off"` make it instant.
 */
export function RollingNumber({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  const next = String(value);
  const [shown, setShown] = useState(next);
  const prevRef = useRef(next);
  const [rolling, setRolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevRef.current === next && !rolling) return;
    // A new value arrived inside the roll: cancel the pending commit and
    // restart the column from the last committed frame.
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const { from, restart } = restartRoll(prevRef.current, next);
    if (!restart) {
      setRolling(false);
      return;
    }
    prevRef.current = from;
    setRolling(true);
    timerRef.current = setTimeout(() => {
      prevRef.current = next;
      setShown(next);
      setRolling(false);
      timerRef.current = null;
    }, ROLL_MS);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [next]);

  const from = rolling ? prevRef.current : shown;
  const to = rolling ? next : shown;
  const direction = rollDirection(from, to);

  return (
    <span className={className ? `ne-roll ${className}` : 'ne-roll'}>
      <span className="sr-only">{next}</span>
      <span aria-hidden>
        {rollSlots(from, to).map(slot => (
          <Slot
            key={`${slot.key}:${to}`}
            from={slot.from}
            to={slot.to}
            direction={direction}
            rolling={rolling}
          />
        ))}
      </span>
    </span>
  );
}
