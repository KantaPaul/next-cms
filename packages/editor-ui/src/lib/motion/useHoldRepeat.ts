import { useEffect, useRef } from 'react';
import { HOLD_REPEAT } from './play';

/**
 * Press-and-hold for stepper buttons: one step on press, then repeated steps
 * after a short delay until release. Keyboard activation (Enter or Space,
 * which fire `click` with `detail === 0`) still steps once, and a pointer
 * press doesn't also count its trailing click. Returning `false` from
 * `step` (a limit was reached) ends the repeat, since a button disabled at
 * its limit may never receive the pointer release.
 */
export function useHoldRepeat(step: () => boolean | void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  const timers = useRef<{ delay?: number; repeat?: number }>({});

  const stop = () => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current = {};
  };

  useEffect(() => stop, []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      stop();
      if (stepRef.current() === false) return;
      timers.current.delay = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(() => {
          if (stepRef.current() === false) stop();
        }, HOLD_REPEAT.interval);
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
