import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, scrubValue } from './math';

export interface UseScrubOptions {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/**
 * Drag horizontally on any element to change a number. Attach the returned
 * `onPointerDown` to a label or handle. Shift is 10x, Alt is 0.1x.
 */
export function useScrub({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  disabled = false,
}: UseScrubOptions) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  // Latest props, so a drag that outlives a render still sees them.
  const latest = useRef({ onChange, step, min, max });
  latest.current = { onChange, step, min, max };

  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startValue = Number.isFinite(value) ? value : 0;
      setIsScrubbing(true);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
      }

      const handleMove = (move: PointerEvent) => {
        const { onChange, step, min, max } = latest.current;
        onChange(
          clamp(
            scrubValue(startValue, move.clientX - startX, step, move),
            min,
            max
          )
        );
      };
      const handleUp = () => {
        setIsScrubbing(false);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
          window.removeEventListener('pointercancel', handleUp);
        }
        cleanupRef.current = null;
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
      }
      cleanupRef.current = handleUp;
    },
    [disabled, value]
  );

  return { isScrubbing, onPointerDown };
}
