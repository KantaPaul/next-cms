import { useRef } from 'react';

/**
 * Focus return for overlays opened from code (no Radix Trigger): remembers
 * what had focus when `open` turned true and gives it back on close. Pass
 * the handler to Radix's `onCloseAutoFocus`.
 */
export function useReturnFocus(open: boolean) {
  const previous = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  // Read during the render that opens it: Radix moves focus inside in an
  // effect, after which the opener can no longer be read from the document.
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    previous.current = document.activeElement as HTMLElement | null;
  }
  wasOpen.current = open;
  return (event: Event) => {
    const target = previous.current;
    if (target && target !== document.body && target.isConnected) {
      event.preventDefault();
      target.focus();
    }
  };
}
