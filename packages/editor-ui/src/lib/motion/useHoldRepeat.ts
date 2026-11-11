import { useEffect, useRef } from 'react';
import { HOLD_REPEAT } from './play';

const MIN_INTERVAL = 30;
const RAMP = 0.85;

/**
 * Press-and-hold for stepper buttons: one step on press, then repeated steps
 * after a short delay until release. Keyboard activation (Enter or Space,
 * which fire `click` with `detail === 0`) still steps once, and a pointer
 * press doesn't also count its trailing click. Returning `false` from
 * `step` (a limit was reached) ends the repeat, since a button disabled at
 * its limit may never receive the pointer release.
 *
 * With `accelerate`, the repeat interval shrinks while held so long presses
 * speed up instead of staying at one tick per `HOLD_REPEAT.interval`.
 */
export function useHoldRepeat(
  step: () => boolean | void,
  options?: { accelerate?: boolean }
) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const accelerate = options?.accelerate ?? false;
  const timers = useRef<{ delay?: number; repeat?: number }>({});

  const stop = () => {
    window.clearTimeout(timers.current.delay);
    window.clearTimeout(timers.current.repeat);
    timers.current = {};
  };

  useEffect(() => stop, []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      stop();
      if (stepRef.current() === false) return;
      timers.current.delay = window.setTimeout(() => {
        let interval: number = HOLD_REPEAT.interval;
        const tick = () => {
          if (stepRef.current() === false) {
            stop();
            return;
          }
          if (accelerate) interval = Math.max(MIN_INTERVAL, interval * RAMP);
          timers.current.repeat = window.setTimeout(tick, interval);
        };
        tick();
      }, HOLD_REPEAT.delay);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) stepRef.current();
    },
  };
}
