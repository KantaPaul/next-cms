'use client';

// Reads the current loop item from React context, so it must render on the client.
import { useLoopItem } from './query-loop-client';
import { formatLoopDate, SAMPLE_LOOP_ITEMS } from './loop-shared';
import { BookmarkToggle } from './bookmarks-client';
import type { ElementStyle } from '../style';
import { el, linkEl } from './element';
import {
  GalleryBadge,
  type GalleryBadgePosition,
  listingItemHasGallery,
} from './gallery-badge';

// ---------------------------------------------------------------------------
// LoopItemField Block (R575 / QRY-05)
// ---------------------------------------------------------------------------

export interface LoopItemFieldProps {
  field?:
    | 'title'
    | 'excerpt'
    | 'image'
    | 'publishedAt'
    | 'author'
    | 'terms'
    | 'readMore'
    | 'bookmark'
    | 'custom';
  customKey?: string;
  linkToItem?: boolean;
  showGalleryBadge?: boolean;
  galleryBadgePosition?: GalleryBadgePosition;
  readMoreLabel?: string;
  language?: string;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}

export function LoopItemField({
  field = 'title',
  customKey = '',
  linkToItem = true,
  showGalleryBadge = true,
  galleryBadgePosition = 'top-right',
  readMoreLabel = 'Read more',
  language = 'en',
  elements,
}: LoopItemFieldProps) {
  const styled = { elements };
  const imageEl = el(styled, 'image', 'aspect-video size-full object-cover');
  const item = useLoopItem() ?? SAMPLE_LOOP_ITEMS[0];
  const hasGallery = listingItemHasGallery(item);

  switch (field) {
    case 'image':
      if (!item.image) return null;
      return linkToItem ? (
        <a href={item.url} className="relative block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.title} loading="lazy" {...imageEl} />
          <GalleryBadge
            show={showGalleryBadge}
            hasGallery={hasGallery}
            count={item.galleryCount}
            position={galleryBadgePosition}
            elements={elements}
          />
        </a>
      ) : (
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.title} loading="lazy" {...imageEl} />
          <GalleryBadge
            show={showGalleryBadge}
            hasGallery={hasGallery}
            count={item.galleryCount}
            position={galleryBadgePosition}
            elements={elements}
          />
        </div>
      );

    case 'title':
      return (
        <h3 {...el(styled, 'value', 'text-lg font-bold leading-snug')}>
          {linkToItem ? (
            <a href={item.url} className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
      );

    case 'excerpt':
      if (!item.excerpt) return null;
      return (
        <p
          {...el(
            styled,
            'value',
            's-muted line-clamp-3 text-sm leading-relaxed'
          )}
        >
          {item.excerpt}
        </p>
      );

    case 'publishedAt': {
      const formatted = formatLoopDate(item.publishedAt, language);
      if (!formatted) return null;
      return (
        <time
          dateTime={item.publishedAt ?? undefined}
          {...el(styled, 'value', 's-muted text-xs')}
        >
          {formatted}
        </time>
      );
    }

    case 'author':
      if (!item.author?.name) return null;
      return (
        <span {...el(styled, 'value', 's-muted text-xs')}>
          {item.author.name}
        </span>
      );

    case 'terms': {
      const terms = item.terms ?? [];
      if (terms.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1.5">
          {terms.map(t => (
            <span
              key={`${t.taxonomy}-${t.id}`}
              {...el(
                styled,
                'value',
                's-primary-text text-xs font-semibold uppercase tracking-wider'
              )}
            >
              {t.name}
            </span>
          ))}
        </div>
      );
    }

    case 'readMore':
      return (
        <a
          href={item.url}
          {...linkEl(
            styled,
            'link',
            's-primary-text inline-flex items-center gap-1 text-sm font-semibold hover:underline'
          )}
        >
          {readMoreLabel} →
        </a>
      );

    case 'bookmark':
      return (
        <BookmarkToggle url={item.url} title={item.title} image={item.image} />
      );

    case 'custom': {
      const rawVal = customKey
        ? (item.raw?.[customKey] ??
          (item as unknown as Record<string, unknown>)[customKey])
        : undefined;
      if (rawVal === undefined || rawVal === null) return null;
      return <span {...el(styled, 'value', 'text-sm')}>{String(rawVal)}</span>;
    }

    default:
      return null;
  }
}
