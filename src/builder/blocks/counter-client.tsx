'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

/* ---------- Pure functions for testing and calculation ---------- */

export function computeCounterStep(
  start: number,
  end: number,
  progress: number
): number {
  const p = Math.max(0, Math.min(1, progress));
  // Ease-out cubic: 1 - Math.pow(1 - p, 3)
  const easeOut = 1 - Math.pow(1 - p, 3);
  return Math.round(start + (end - start) * easeOut);
}

export function formatCounterValue(
  current: number,
  separator = '',
  prefix = '',
  suffix = ''
): string {
  const numStr = Math.round(current).toString();
  let formatted = numStr;

  if (separator) {
    // Add separator every 3 digits from right
    formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  return `${prefix}${formatted}${suffix}`;
}

/* ---------- Counter Component ---------- */

export type CounterProps = WithSection & {
  start?: number;
  end?: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  separator?: ',' | '.' | ' ' | '';
  title?: string;
  alignment?: 'left' | 'center' | 'right';
};

export function Counter(p: CounterProps) {
  const start = typeof p.start === 'number' ? p.start : 0;
  const end = typeof p.end === 'number' ? p.end : 100;
  const duration = typeof p.duration === 'number' && p.duration > 0 ? p.duration : 2000;
  const prefix = p.prefix ?? '';
  const suffix = p.suffix ?? '';
  const separator = p.separator ?? '';
  const align = p.alignment ?? 'center';

  const numberEl = el(p, 'number', 'text-4xl s-tab-text-5xl font-extrabold tracking-tight s-primary-text font-mono');
  const titleEl = el(p, 'title', 'mt-2 text-sm font-medium s-muted');

  const [current, setCurrent] = useState(end);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) {
      setCurrent(end);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    let startTime = 0;
    let animId = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const val = computeCounterStep(start, end, progress);
      setCurrent(val);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !hasAnimated) {
          setCurrent(start);
          animId = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [start, end, duration, hasAnimated]);

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        ref={containerRef}
        className={cn(
          'flex flex-col w-full',
          align === 'center'
            ? 'items-center text-center'
            : align === 'right'
              ? 'items-end text-end'
              : 'items-start text-start'
        )}
      >
        <span className={numberEl.className} style={numberEl.style}>
          {formatCounterValue(current, separator, prefix, suffix)}
        </span>
        {p.title && (
          <p className={titleEl.className} style={titleEl.style}>
            {p.title}
          </p>
        )}
      </div>
    </Section>
  );
}
