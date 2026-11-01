import { Pause, Play, RotateCcw } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { IconButton } from '../primitives/IconButton';

export interface AnimationTimelineViewProps {
  duration?: number; // in milliseconds (default 600)
  delay?: number; // in milliseconds (default 0)
  easing?: string;
  label?: string;
  onTimeChange?: (timeMs: number) => void;
  className?: string;
}

export function AnimationTimelineView({
  duration = 600,
  delay = 0,
  easing = 'ease-out',
  label = 'Animation Timeline',
  onTimeChange,
  className,
}: AnimationTimelineViewProps) {
  const totalTime = Math.max(duration + delay, 100);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      const step = (now: number) => {
        if (lastTimeRef.current !== null) {
          const delta = now - lastTimeRef.current;
          setCurrentTime(prev => {
            const next = prev + delta;
            if (next >= totalTime) {
              setIsPlaying(false);
              onTimeChange?.(totalTime);
              return totalTime;
            }
            onTimeChange?.(next);
            return next;
          });
        }
        lastTimeRef.current = now;
        animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    } else {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, totalTime, onTimeChange]);

  const handlePlayToggle = () => {
    if (currentTime >= totalTime) {
      setCurrentTime(0);
      onTimeChange?.(0);
    }
    setIsPlaying(v => !v);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onTimeChange?.(0);
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / totalTime) * 100));
  const delayPercent = (delay / totalTime) * 100;
  const activePercent = (duration / totalTime) * 100;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg border border-[var(--ne-border,rgba(127,127,127,0.2))] bg-[var(--ne-surface,#ffffff)]',
        className
      )}
      role="region"
      aria-label={label}
    >
      {/* Header controls & time readout */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={isPlaying ? 'Pause' : 'Play animation preview'}
            tooltip={isPlaying ? 'Pause' : 'Play'}
            onClick={handlePlayToggle}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Reset timeline"
            tooltip="Reset"
            onClick={handleReset}
          >
            <RotateCcw size={13} />
          </IconButton>
          <span className="font-medium text-[var(--ne-text,inherit)] ml-1">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ne-text-muted,#64748b)]">
          <span>{(currentTime / 1000).toFixed(2)}s</span>
          <span>/</span>
          <span>{(totalTime / 1000).toFixed(2)}s</span>
        </div>
      </div>

      {/* Timeline ruler & track */}
      <div className="relative flex flex-col gap-1 select-none">
        {/* Track bar */}
        <div
          className="relative h-6 rounded-md bg-[var(--ne-surface-active,rgba(127,127,127,0.1))] overflow-hidden cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const newTime = clickRatio * totalTime;
            setCurrentTime(newTime);
            onTimeChange?.(newTime);
          }}
        >
          {/* Delay block */}
          {delay > 0 && (
            <div
              style={{
                width: `${delayPercent}%`,
              }}
              className="absolute left-0 top-0 bottom-0 bg-[var(--ne-surface-muted,rgba(127,127,127,0.2))] border-r border-dashed border-[var(--ne-border,rgba(127,127,127,0.3))]"
              title={`Delay: ${delay}ms`}
            />
          )}

          {/* Active animation block */}
          <div
            style={{
              left: `${delayPercent}%`,
              width: `${activePercent}%`,
            }}
            className="absolute top-0 bottom-0 bg-[var(--ne-primary-soft,rgba(79,70,229,0.2))] border-l border-r border-[var(--ne-primary,#4f46e5)] flex items-center px-1"
            title={`Duration: ${duration}ms (${easing})`}
          >
            <span className="text-[9px] font-semibold text-[var(--ne-primary,#4f46e5)] truncate">
              {easing}
            </span>
          </div>

          {/* Current playhead line */}
          <div
            style={{
              left: `${progressPercent}%`,
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--ne-danger,#ef4444)] z-10 pointer-events-none"
          >
            <div className="w-2 h-2 -ml-[3px] bg-[var(--ne-danger,#ef4444)] rotate-45" />
          </div>
        </div>

        {/* Ruler ticks */}
        <div className="flex justify-between text-[9px] text-[var(--ne-text-muted,#94a3b8)] px-0.5">
          <span>0s</span>
          {delay > 0 && <span>{(delay / 1000).toFixed(1)}s (delay)</span>}
          <span>{(totalTime / 1000).toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
}
