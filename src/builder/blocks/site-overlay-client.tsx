'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Matches the exit animations in site.css. */
const EXIT_MS = 200;

/**
 * Renders a full-screen overlay at the top of the site. A header with a
 * backdrop blur becomes the containing block for `position: fixed`, which would
 * trap a drawer or modal inside the header bar. It stays under `.site-root` so
 * the site's theme variables still apply.
 *
 * It stays mounted after `open` turns false until the exit animation ends. The
 * target is found up front so children mount in the same commit as `open`, and
 * a parent's effect can focus them straight away.
 */
export function SiteOverlay({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<Element | null>(null);
  const [leaving, setLeaving] = useState(false);
  const wasOpen = useRef(open);

  useEffect(() => {
    const node = marker.current;
    if (node) setTarget(node.closest('.site-root') ?? node.ownerDocument.body);
  }, []);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      setLeaving(false);
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setLeaving(true);
    const timer = window.setTimeout(() => setLeaving(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <>
      <span ref={marker} hidden />
      {target &&
        (open || leaving) &&
        createPortal(
          <div data-site-overlay={open ? 'open' : 'closed'}>{children}</div>,
          target
        )}
    </>
  );
}
