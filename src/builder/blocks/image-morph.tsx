'use client';

import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { interpolate } from 'flubber';
import {
  morphShapePaths,
  resolveMorph,
  type MorphData,
  type MorphTiming,
} from '../morph';
import { type SectionSettings, Section } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type ImageMorphProps = WithSection & {
  /** The single custom field: effect, shape, timing, and style groups. */
  morph?: MorphData;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function filterCss(f: {
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  grayscale?: number;
}): string | undefined {
  const parts: string[] = [];
  const blur = f.blur ?? 0;
  const brightness = f.brightness ?? 100;
  const contrast = f.contrast ?? 100;
  const saturate = f.saturate ?? 100;
  const grayscale = f.grayscale ?? 0;
  if (blur) parts.push(`blur(${blur}px)`);
  if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
  if (saturate !== 100) parts.push(`saturate(${saturate}%)`);
  if (grayscale) parts.push(`grayscale(${grayscale}%)`);
  return parts.length ? parts.join(' ') : undefined;
}

export function ImageMorph(p: ImageMorphProps) {
  const m = resolveMorph(p.morph);
  const shapeKey = JSON.stringify(m.shape);
  const paths = useMemo(() => morphShapePaths(m), [shapeKey]);
  const firstPath = paths[0];
  const clipId = useId();
  const gradientId = useId();
  const [d, setD] = useState(firstPath);
  const reduced = useReducedMotion();

  const timing = m.timing;
  const durationMs = Math.max(1, timing.duration ?? 0.6) * 1000;
  const holdMs = (timing.endDelay ?? 0) * 1000;
  const periodMs = durationMs + holdMs;

  useEffect(() => {
    if (reduced || paths.length < 2) {
      // Invalid or single-shape data renders the first path with no tween.
      setD(paths[0]);
      return;
    }
    const tween = interpolate(paths[0], paths[1], { curve: timing.easing });
    let raf = 0;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime - (timing.delay ?? 0) * 1000;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      let progress: number;
      let looping = false;
      if (timing.loop) {
        const cycle = elapsed % periodMs;
        progress = cycle < durationMs ? cycle / durationMs : 1;
        looping = elapsed >= periodMs;
      } else {
        progress = durationMs > 0 ? Math.min(elapsed / durationMs, 1) : 1;
      }
      const t = timing.direction === 'reverse' ? 1 - progress : progress;
      const value = tween(t);
      setD(typeof value === 'string' ? value : paths[0]);
      if (!looping && elapsed >= periodMs) {
        cancelAnimationFrame(raf);
        return;
      }
      if (looping) startTime = null;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, paths, timing, durationMs, holdMs, periodMs]);

  const imageStyle: CSSProperties = {
    opacity: m.image.opacity,
    ...(filterCss(m.image) ? { filter: filterCss(m.image) } : {}),
    transform: `translate(${(m.image.posX ?? 50) - 50}%, ${(m.image.posY ?? 50) - 50}%) scale(${m.image.zoom ?? 1})`,
  };

  return (
    <Section section={p.section} editing={p.editing}>
      <div className="aspect-video w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Morphing shape">
          <defs>
            <clipPath id={clipId}>
              <path d={d} />
            </clipPath>
            {m.effect === 'gradient' ? (
              <linearGradient
                id={gradientId}
                x1={(m.gradient.x1 ?? 0) / 100}
                y1={(m.gradient.y1 ?? 0) / 100}
                x2={(m.gradient.x2 ?? 0) / 100}
                y2={(m.gradient.y2 ?? 0) / 100}
              >
                <stop offset={String((m.gradient.start ?? 0) / 100)} stopColor={m.gradient.from} />
                <stop offset={String((m.gradient.end ?? 0) / 100)} stopColor={m.gradient.to} />
              </linearGradient>
            ) : null}
          </defs>
          {m.effect === 'image' ? (
            <g clipPath={`url(#${clipId})`} style={imageStyle}>
              {m.image.url ? (
                <image
                  href={m.image.url}
                  x={0}
                  y={0}
                  width="100"
                  height="100"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : null}
            </g>
          ) : null}
          {m.effect === 'color' ? (
            <path
              d={d}
              fill={m.color.fill}
              stroke={m.color.stroke || undefined}
              strokeWidth={m.color.strokeWidth || undefined}
              opacity={m.color.opacity}
            />
          ) : null}
          {m.effect === 'gradient' ? (
            <path d={d} fill={`url(#${gradientId})`} opacity={m.gradient.opacity} />
          ) : null}
        </svg>
      </div>
    </Section>
  );
}
