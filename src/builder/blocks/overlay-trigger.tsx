import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { overlayHref } from '@/lib/overlays/href';

export type OverlayTriggerLightbox = {
  image?: string | null;
  alt?: string | null;
  caption?: string | null;
};

export type OverlayTriggerProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  overlayId?: string | null;
  lightbox?: OverlayTriggerLightbox;
  children: ReactNode;
};

/**
 * Wraps content in an anchor that opens a popup or drawer when clicked.
 * If no overlay ID is provided, renders children directly without a wrapper.
 */
export function OverlayTrigger({
  overlayId,
  lightbox,
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
      data-overlay-image={lightbox?.image || undefined}
      data-overlay-alt={lightbox?.alt || undefined}
      data-overlay-caption={lightbox?.caption || undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
