'use client';

import { useEffect } from 'react';
import { readBreakpointsFromDocument } from './breakpoints';
import {
  type BreakpointConfig,
  type Device,
  deviceForWidth,
  hasActiveMotion,
  type MotionEffectsSettings,
} from './style';

/* ---------- Pure math functions for testing and animation calculation ---------- */

/**
 * Calculates progress (0 to 1) of an element scrolling across the viewport.
 * startPct and endPct are 0–100 percentages of viewport height (0 = bottom, 100 = top).
 */
export function calculateScrollProgress(
  elementTop: number,
  elementHeight: number,
  viewportHeight: number,
  startPct = 0,
  endPct = 100
): number {
  if (viewportHeight <= 0) return 0;
  // Element position relative to viewport: 1 when entering bottom, 0 when leaving top
  const totalTravel = viewportHeight + elementHeight;
  const currentTravel = viewportHeight - elementTop;
  const rawProgress = totalTravel > 0 ? currentTravel / totalTravel : 0;

  const startFrac = Math.max(0, Math.min(1, startPct / 100));
  const endFrac = Math.max(0, Math.min(1, endPct / 100));

  if (endFrac <= startFrac) return rawProgress < startFrac ? 0 : 1;

  const clamped = Math.max(startFrac, Math.min(endFrac, rawProgress));
  return (clamped - startFrac) / (endFrac - startFrac);
}

/**
 * Computes CSS transform and opacity from scroll transform settings and normalized progress.
 */
export function computeScrollTransform(
  settings: NonNullable<MotionEffectsSettings['scrollTransform']>,
  progress: number
): { transform: string; opacity?: number } {
  const p = Math.max(0, Math.min(1, progress));
  const transforms: string[] = [];

  if (typeof settings.translateY === 'number') {
    const val = (p - 0.5) * 2 * settings.translateY;
    transforms.push(`translateY(${val.toFixed(2)}px)`);
  }

  if (typeof settings.rotate === 'number') {
    const val = (p - 0.5) * 2 * settings.rotate;
    transforms.push(`rotate(${val.toFixed(2)}deg)`);
  }

  if (typeof settings.scale === 'number') {
    // 1 at center, interpolates based on scale
    const val = 1 + (p - 0.5) * 2 * (settings.scale - 1);
    transforms.push(`scale(${Math.max(0.01, val).toFixed(3)})`);
  }

  let opacity: number | undefined = undefined;
  if (typeof settings.opacity === 'number') {
    opacity = 1 - (1 - settings.opacity) * Math.abs(p - 0.5) * 2;
    opacity = Math.max(0, Math.min(1, opacity));
  }

  return {
    transform: transforms.length > 0 ? transforms.join(' ') : 'none',
    opacity,
  };
}

/**
 * Computes pixel translateY offset for parallax scroll effect.
 */
export function computeParallaxOffset(
  elementTop: number,
  viewportHeight: number,
  speed: number
): number {
  const centerDiff = elementTop - viewportHeight / 2;
  return -centerDiff * (speed * 0.1);
}

/**
 * Computes pixel x/y offset for mouse tracking effect.
 */
export function computeMouseTrackOffset(
  mouseX: number,
  mouseY: number,
  windowWidth: number,
  windowHeight: number,
  strength: number,
  direction: 'opposite' | 'direct' = 'opposite'
): { x: number; y: number } {
  if (windowWidth <= 0 || windowHeight <= 0) return { x: 0, y: 0 };
  const normX = (mouseX / windowWidth - 0.5) * 2;
  const normY = (mouseY / windowHeight - 0.5) * 2;
  const sign = direction === 'direct' ? 1 : -1;
  return {
    x: normX * strength * sign,
    y: normY * strength * sign,
  };
}

export function currentDevice(
  win?: Window,
  config?: BreakpointConfig
): Device {
  const target = win ?? (typeof window !== 'undefined' ? window : undefined);
  if (!target) return 'desktop';
  const bp = config ?? readBreakpointsFromDocument(target.document);
  return deviceForWidth(target.innerWidth, bp);
}

/* ---------- Shared rAF Loop Runtime ---------- */

export function initMotionEffectsLoop(doc?: Document): () => void {
  const targetDoc =
    doc ?? (typeof document !== 'undefined' ? document : undefined);
  const win =
    targetDoc?.defaultView ??
    (typeof window !== 'undefined' ? window : undefined);
  if (!targetDoc || !win) return () => {};

  let rafId = 0;
  let mouseX = win.innerWidth / 2;
  let mouseY = win.innerHeight / 2;
  let isPointerActive = false;
  const touched = new Set<HTMLElement>();

  const onPointerMove = (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isPointerActive = true;
  };

  const isReducedMotion = () =>
    win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tick = () => {
    if (!isReducedMotion()) {
      const dev = currentDevice(win, readBreakpointsFromDocument(targetDoc));
      const vh = win.innerHeight;
      const vw = win.innerWidth;

      // 1. Process elements with data-motion
      const motionEls = targetDoc.querySelectorAll<HTMLElement>('[data-motion]');
      for (const el of motionEls) {
        try {
          const raw = el.dataset.motion;
          if (!raw) continue;
          const motion: MotionEffectsSettings = JSON.parse(raw);

          // Check active effects and device filter
          if (
            !hasActiveMotion(motion) ||
            (Array.isArray(motion.devices) && !motion.devices.includes(dev))
          ) {
            if (touched.has(el)) {
              el.style.transform = '';
              el.style.opacity = '';
              el.style.willChange = '';
            }
            continue;
          }

          const rect = el.getBoundingClientRect();
          const transforms: string[] = [];
          let nextOpacity: number | undefined;

          // Parallax
          if (motion.parallax && typeof motion.parallax.speed === 'number') {
            const offset = computeParallaxOffset(
              rect.top,
              vh,
              motion.parallax.speed
            );
            if (motion.parallax.direction === 'horizontal') {
              transforms.push(`translateX(${offset.toFixed(2)}px)`);
            } else {
              transforms.push(`translateY(${offset.toFixed(2)}px)`);
            }
          }

          // Scroll transform
          if (motion.scrollTransform) {
            const progress = calculateScrollProgress(
              rect.top,
              rect.height,
              vh,
              motion.scrollTransform.start ?? 0,
              motion.scrollTransform.end ?? 100
            );
            const { transform, opacity } = computeScrollTransform(
              motion.scrollTransform,
              progress
            );
            if (transform !== 'none') transforms.push(transform);
            nextOpacity = opacity;
          }

          // Mouse tracking
          if (motion.mouseTrack && isPointerActive) {
            const offset = computeMouseTrackOffset(
              mouseX,
              mouseY,
              vw,
              vh,
              motion.mouseTrack.strength ?? 10,
              motion.mouseTrack.direction ?? 'opposite'
            );
            transforms.push(
              `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0)`
            );
          }

          if (transforms.length > 0) {
            el.style.transform = transforms.join(' ');
            el.style.willChange = 'transform';
            touched.add(el);
          } else if (touched.has(el)) {
            el.style.transform = '';
            el.style.willChange = '';
          }

          if (nextOpacity !== undefined) {
            el.style.opacity = nextOpacity.toFixed(3);
            touched.add(el);
          } else if (touched.has(el)) {
            el.style.opacity = '';
          }
        } catch {
          // Ignore invalid JSON
        }
      }

      // 2. Process background parallax [data-bg-parallax]
      const bgEls =
        targetDoc.querySelectorAll<HTMLElement>('[data-bg-parallax]');
      for (const bg of bgEls) {
        const parent = bg.parentElement?.parentElement;
        if (!parent) continue;
        const rect = parent.getBoundingClientRect();
        const speed = Number.parseFloat(bg.dataset.parallaxSpeed || '0.4');
        const offset = computeParallaxOffset(rect.top, vh, speed * 10);
        bg.style.transform = `translateY(${offset.toFixed(2)}px)`;
        bg.style.willChange = 'transform';
        touched.add(bg);
      }
    }

    rafId = win.requestAnimationFrame(tick);
  };

  win.addEventListener('mousemove', onPointerMove, { passive: true });
  rafId = win.requestAnimationFrame(tick);

  return () => {
    win.cancelAnimationFrame(rafId);
    win.removeEventListener('mousemove', onPointerMove);
    for (const el of touched) {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.willChange = '';
    }
    touched.clear();
  };
}

export function MotionEffectsClient() {
  useEffect(() => {
    return initMotionEffectsLoop();
  }, []);

  return null;
}
