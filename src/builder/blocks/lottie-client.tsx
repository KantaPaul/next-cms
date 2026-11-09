'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';
import { calculateScrollProgress } from '../motion-effects-client';

export type LottieProps = WithSection & {
  source?: 'url' | 'json';
  url?: string;
  jsonData?: string;
  trigger?: 'load' | 'view' | 'hover' | 'scroll';
  loop?: boolean;
  speed?: number;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
};

export function Lottie(p: LottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const trigger = p.trigger ?? 'load';
  const loop = p.loop ?? true;
  const speed = typeof p.speed === 'number' ? p.speed : 1;
  const width = p.width ?? 300;
  const height = p.height ?? 300;
  const align = p.alignment ?? 'center';

  useEffect(() => {
    let isCancelled = false;

    async function loadLottie() {
      if (!containerRef.current) return;
      if (!p.url && !p.jsonData) return;

      try {
        const lottieModule = await import('lottie-web');
        const lottie = lottieModule.default || lottieModule;

        if (isCancelled || !containerRef.current) return;

        // Clean up previous instance
        if (animRef.current) {
          animRef.current.destroy();
        }

        let animationData: any = undefined;
        if (p.source === 'json' && p.jsonData) {
          try {
            animationData = JSON.parse(p.jsonData);
          } catch {
            setError('Invalid JSON');
            return;
          }
        }

        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: trigger === 'scroll' ? false : loop,
          autoplay: trigger === 'load',
          path: p.source !== 'json' && p.url ? p.url : undefined,
          animationData,
        });

        anim.setSpeed(speed);
        animRef.current = anim;
        setError(null);

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          anim.goToAndStop(0, true);
          return;
        }

        // Trigger behaviors
        if (trigger === 'view') {
          const observer = new IntersectionObserver(
            entries => {
              if (entries[0]?.isIntersecting) {
                anim.play();
              } else {
                anim.pause();
              }
            },
            { threshold: 0.2 }
          );
          observer.observe(containerRef.current);
          return () => observer.disconnect();
        }

        if (trigger === 'scroll') {
          const onScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const progress = calculateScrollProgress(
              rect.top,
              rect.height,
              window.innerHeight,
              0,
              100
            );
            const totalFrames = anim.totalFrames || 100;
            anim.goToAndStop(progress * totalFrames, true);
          };

          window.addEventListener('scroll', onScroll, { passive: true });
          onScroll();
          return () => window.removeEventListener('scroll', onScroll);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Failed to load Lottie animation');
        }
      }
    }

    loadLottie();

    return () => {
      isCancelled = true;
      if (animRef.current) {
        animRef.current.destroy();
      }
    };
  }, [p.source, p.url, p.jsonData, trigger, loop, speed]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && animRef.current) {
      animRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover' && animRef.current) {
      animRef.current.pause();
    }
  };

  const boxEl = el(p, 'box');

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        className={cn(
          'flex w-full',
          align === 'center'
            ? 'justify-center'
            : align === 'right'
              ? 'justify-end'
              : 'justify-start'
        )}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn('relative max-w-full', boxEl.className)}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            ...boxEl.style,
          }}
        >
          {!p.url && !p.jsonData && (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-steel-200 text-xs text-steel-400 dark:border-dark-300">
              {p.editing ? 'Configure Lottie JSON URL in sidebar' : null}
            </div>
          )}
          {error && (
            <div className="flex h-full w-full items-center justify-center text-xs text-rose-500">
              {error}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
