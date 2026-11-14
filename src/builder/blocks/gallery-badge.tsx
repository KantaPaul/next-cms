import type { NormalizedListingItem } from '@nextcms/builder-core';
import { Images } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';

export type GalleryBadgePosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

const POSITION_CLASS: Record<GalleryBadgePosition, string> = {
  'top-right': 'end-2.5 top-2.5',
  'top-left': 'start-2.5 top-2.5',
  'bottom-right': 'bottom-2.5 end-2.5',
  'bottom-left': 'bottom-2.5 start-2.5',
};

/** Returns true when a listing item has multiple gallery images. */
export function listingItemHasGallery(
  item: Pick<NormalizedListingItem, 'hasGallery' | 'galleryCount'>
): boolean {
  return (
    Boolean(item.hasGallery) ||
    (typeof item.galleryCount === 'number' && item.galleryCount > 1)
  );
}

/** Round circular gallery indicator badge overlaid on post/entry card images. */
export function GalleryBadge({
  show = true,
  hasGallery,
  count,
  position = 'top-right',
  elements,
}: {
  show?: boolean;
  hasGallery: boolean;
  count?: number;
  position?: GalleryBadgePosition;
  elements?: Record<string, ElementStyle>;
}) {
  if (show === false || !hasGallery) return null;

  const badgeEl = el(
    { elements },
    'galleryBadge',
    cn(
      'pointer-events-none absolute z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/65 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-sm',
      POSITION_CLASS[position]
    )
  );

  return (
    <span
      {...badgeEl}
      data-gallery-badge=""
      aria-label={
        typeof count === 'number' && count > 1
          ? `Gallery (${count} images)`
          : 'Gallery'
      }
      title={
        typeof count === 'number' && count > 1
          ? `${count} images`
          : 'Gallery'
      }
    >
      <Images className="size-4" aria-hidden />
    </span>
  );
}
