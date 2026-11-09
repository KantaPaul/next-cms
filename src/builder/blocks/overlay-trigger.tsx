import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { overlayHref } from '@/lib/overlays/href';

export type OverlayTriggerProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  overlayId?: string | null;
  children: ReactNode;
};

/**
 * Wraps content in an anchor that opens a popup or drawer when clicked.
 * If no overlay ID is provided, renders children directly without a wrapper.
 */
export function OverlayTrigger({
  overlayId,
  children,
  ...rest
}: OverlayTriggerProps) {
  const id = overlayId?.trim();

  if (!id) {
    return <>{children}</>;
  }

  return (
    <a
      href={overlayHref(id)}
      data-overlay-open={id}
      aria-haspopup="dialog"
      {...rest}
    >
      {children}
    </a>
  );
}
