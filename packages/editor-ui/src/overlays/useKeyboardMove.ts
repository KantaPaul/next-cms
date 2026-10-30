import * as React from 'react';

export interface KeyboardMoveState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseKeyboardMoveOptions {
  onMove?: (state: KeyboardMoveState) => void;
  onResize?: (state: KeyboardMoveState) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  step?: number;
  resizeStep?: number;
}

export function useKeyboardMove(options: UseKeyboardMoveOptions = {}) {
  const {
    onMove,
    onResize,
    onConfirm,
    onCancel,
    step = 1,
    resizeStep = 1,
  } = options;
  const [active, setActive] = React.useState(false);
  const stateRef = React.useRef<KeyboardMoveState>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  const setState = React.useCallback(
    (next: KeyboardMoveState) => {
      stateRef.current = next;
      onMove?.(next);
    },
    [onMove]
  );

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (!active) return;
      const s = stateRef.current;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (e.shiftKey)
            onResize?.({ ...s, height: Math.max(1, s.height - resizeStep) });
          else setState({ ...s, y: s.y - step });
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (e.shiftKey) onResize?.({ ...s, height: s.height + resizeStep });
          else setState({ ...s, y: s.y + step });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey)
            onResize?.({ ...s, width: Math.max(1, s.width - resizeStep) });
          else setState({ ...s, x: s.x - step });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) onResize?.({ ...s, width: s.width + resizeStep });
          else setState({ ...s, x: s.x + step });
          break;
        case 'Enter':
          e.preventDefault();
          onConfirm?.();
          setActive(false);
          break;
        case 'Escape':
          e.preventDefault();
          onCancel?.();
          setActive(false);
          break;
      }
    },
    [active, step, resizeStep, setState, onMove, onResize, onConfirm, onCancel]
  );

  React.useEffect(() => {
    if (active) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [active, handleKeyDown]);

  const start = React.useCallback((initial: KeyboardMoveState) => {
    stateRef.current = initial;
    setActive(true);
  }, []);

  const stop = React.useCallback(() => setActive(false), []);

  return { active, start, stop };
}
