export const OVERLAY_HREF_PREFIX = '#overlay:';

/** Builds an `#overlay:<id>` link target for opening a popup or drawer. */
export function overlayHref(id: string): string {
  return `${OVERLAY_HREF_PREFIX}${id.trim()}`;
}

/** Extracts the overlay ID from an `#overlay:<id>` URL, or null for any other URL. */
export function parseOverlayHref(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.startsWith(OVERLAY_HREF_PREFIX)) {
    return null;
  }
  const id = url.slice(OVERLAY_HREF_PREFIX.length).trim();
  return id || null;
}
