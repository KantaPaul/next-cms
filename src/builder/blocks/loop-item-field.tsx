'use client';

// Reads the current loop item from React context, so it must render on the client.
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import {
  EMBED_URL_ERROR,
  entryMediaValues,
  GENERAL_URL_ERROR,
  isValidEmbedUrl,
  isValidGeneralUrl,
  mergeFeaturedWithFieldMedia,
  parseEmbedInput,
  parseVideoUrl,
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
  type TextFieldMode,
  type UrlFieldMode,
  VIDEO_URL_ERROR,
} from '@/config/post-types';
import {
  type ExternalApiArrayLayout,
  type ExternalApiFieldMapping,
  type ExternalApiFieldType,
  type ExternalApiNestedFieldMapping,
  extractNestedValue,
  shortLabelForApiKeyPath,
} from '@/lib/external-api-schema';
import { cn } from '@/lib/utils/cn';
import {
  type LoopItemFieldOption,
  useLoopPreview,
} from '../controls/loop-preview';
import { parseOverlayHref } from '../controls/overlay-picker';
import { sanitizeRichText } from '../sanitize';
import {
  type ElementStyle,
  hasActiveMotion,
  type MotionEffectsSettings,
  normalizeUrlValue,
  resolveElementStyle,
  type SectionSettings,
  type UrlValue,
} from '../style';
import { BookmarkToggle } from './bookmarks-client';
import {
  CollectionGallery,
  type GalleryAspect,
  type GalleryStyle,
} from './collection-gallery-client';
import { el, linkEl } from './element';
import { EmbedContentFrame, VideoContentFrame } from './embed-frames';
import {
  GalleryBadge,
  type GalleryBadgePosition,
  listingItemHasGallery,
} from './gallery-badge';
import {
  formatLoopDate,
  type LoopDateFormat,
  SAMPLE_LOOP_ITEMS,
} from './loop-shared';
import { OverlayTrigger } from './overlay-trigger';
import { useLoopItem } from './query-loop-client';
import { Section } from './section';

// ---------------------------------------------------------------------------
// LoopItemField Block (R575 / QRY-05)
// ---------------------------------------------------------------------------

export type LoopFieldKind =
  | 'title'
  | 'excerpt'
  | 'image'
  | 'publishedAt'
  | 'author'
  | 'terms'
  | 'readMore'
  | 'bookmark'
  | 'custom';

export type LoopTextSize =
  | 'auto'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'lead'
  | 'body'
  | 'small';
export type LoopAlign = 'left' | 'center' | 'right';
export type LoopUrlDisplayMode = 'link' | 'button' | 'text';
export type LoopAuthorDisplay = 'name' | 'avatar-name' | 'avatar';
export type LoopTermsDisplay = 'badges' | 'pills' | 'dot' | 'comma' | 'plain';
export type LoopMaxLines = 'none' | '2' | '3' | '4' | '6';
export type LoopImageAspect =
  | 'video'
  | 'landscape'
  | 'square'
  | 'portrait'
  | 'wide'
  | 'auto';
export type LoopGalleryViewMode =
  | 'featured-slider'
  | 'featured-badge'
  | GalleryStyle;

export const LOOP_GALLERY_VIEW_OPTIONS: {
  label: string;
  value: LoopGalleryViewMode;
}[] = [
  { label: 'Featured Image + Slider', value: 'featured-slider' },
  { label: 'Featured Image + Gallery Icon Only', value: 'featured-badge' },
  { label: 'Story Carousel + Thumbnails', value: 'carousel' },
  { label: 'Facebook Smart (Auto Collage)', value: 'facebook' },
  { label: 'Facebook Top Hero (1 + Strip)', value: 'fb-top' },
  { label: 'Facebook Left Hero (1 + Stack)', value: 'fb-left' },
  { label: 'Facebook Mosaic (2 + 3)', value: 'fb-mosaic' },
  { label: 'Facebook 2×2 Collage', value: 'fb-2x2' },
  { label: '3-Column Grid', value: 'grid-3' },
  { label: 'Masonry Feed', value: 'masonry' },
  { label: 'Stacked Stream', value: 'stacked' },
];

export type LoopMultiFieldLayout =
  | 'stack'
  | 'row'
  | 'inline'
  | 'grid'
  | 'cards'
  | 'badges'
  | 'list'
  | 'table';

export type LoopItemFieldRow = {
  field?: LoopFieldKind;
  customKey?: string;
  /** View layout when multiple comma-separated `customKey` fields are selected. */
  multiLayout?: LoopMultiFieldLayout;
  /** Optional explicit field type override (matches collection / external API field types). */
  fieldType?: ExternalApiFieldType | 'auto';
  /** Dynamic view mode for `text` fields (`plain` | `video` | `embed`). */
  textMode?: TextFieldMode;
  /** Dynamic view mode for `url` fields (`other` | `video`). */
  urlMode?: UrlFieldMode;
  /** Dynamic view mode for `media` fields (multi-image gallery vs single). */
  multiple?: boolean;
  /** Dynamic view mode for `media` fields (featured image). */
  isFeatured?: boolean;
  /** Layout for `array` fields (`cards` | `stack` | `row` | `grid` | `badges` | `list`). */
  arrayLayout?: ExternalApiArrayLayout;
  /** Nested multi-repeatable field mappings when `fieldType === 'array'`. */
  nestedFields?: ExternalApiNestedFieldMapping[];
  showLabel?: boolean;
  labelText?: string;
  textSize?: LoopTextSize;
  linkToItem?: boolean;
  singlePageUrl?: string;
  readMoreLabel?: string;
  urlDisplay?: LoopUrlDisplayMode;
  urlLinkText?: string;
  urlNewTab?: boolean;
  urlConfig?: UrlValue;
  showArrow?: boolean;
  dateFormat?: LoopDateFormat;
  datePrefix?: string;
  authorDisplay?: LoopAuthorDisplay;
  authorPrefix?: string;
  termsDisplay?: LoopTermsDisplay;
  termsTaxonomy?: string;
  maxLines?: LoopMaxLines;
  stripHtml?: boolean;
  imageAspect?: LoopImageAspect;
  showGalleryBadge?: boolean;
  galleryBadgePosition?: GalleryBadgePosition;
  galleryViewMode?: LoopGalleryViewMode;
  galleryStyle?: GalleryStyle;
  galleryAspect?: GalleryAspect;
  excludeFeaturedImage?: boolean;
  popupTrigger?: boolean;
  overlayId?: string;
  posterUrl?: string;
  motion?: MotionEffectsSettings;
  style?: ElementStyle;
  labelStyle?: ElementStyle;
  badgeStyle?: ElementStyle;
};

export interface LoopItemFieldProps extends LoopItemFieldRow {
  /** Multiple fields to display, each with its own options and style. */
  items?: LoopItemFieldRow[];
  layout?: 'clean' | 'card' | 'table';
  direction?: 'stack' | 'row' | 'grid';
  gap?: 'sm' | 'md' | 'lg';
  align?: LoopAlign;
  language?: string;
  editing?: boolean;
  section?: SectionSettings;
  elements?: Record<string, ElementStyle>;
}

const SIZE_CLASS: Record<Exclude<LoopTextSize, 'auto'>, string> = {
  h1: 'text-3xl s-tab-text-4xl font-extrabold tracking-tight text-[var(--site-fg)]',
  h2: 'text-2xl s-tab-text-3xl font-bold tracking-tight text-[var(--site-fg)]',
  h3: 'text-lg font-bold leading-snug text-[var(--site-fg)]',
  lead: 'text-base s-tab-text-lg s-muted leading-relaxed',
  body: 'text-sm text-[var(--site-fg)] leading-relaxed',
  small: 'text-xs s-muted',
};

const SIZE_TAG: Record<
  Exclude<LoopTextSize, 'auto'>,
  'h1' | 'h2' | 'h3' | 'p' | 'span'
> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  lead: 'p',
  body: 'p',
  small: 'span',
};

const IMAGE_ASPECT_CLASS: Record<LoopImageAspect, string> = {
  video: 'aspect-video',
  landscape: 'aspect-[4/3]',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]',
  auto: '',
};

const GAP_CLASS = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' } as const;

const ALIGN_CLASS: Record<LoopAlign, string> = {
  left: 'text-start',
  center: 'text-center',
  right: 'text-end',
};

const LINE_CLAMP_CLASS: Record<Exclude<LoopMaxLines, 'none'>, string> = {
  '2': 'line-clamp-2',
  '3': 'line-clamp-3',
  '4': 'line-clamp-4',
  '6': 'line-clamp-6',
};

function styleOf(style: ElementStyle | undefined): {
  classes: string[];
  style: CSSProperties;
} {
  if (!style || Object.keys(style).length === 0)
    return { classes: [], style: {} };
  return resolveElementStyle(style);
}

function readPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  return extractNestedValue(obj, path);
}

function humanizeKey(key: string): string {
  if (!key || key === '.') return 'Value';
  return shortLabelForApiKeyPath(key);
}

function BuilderValidationBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-1.5 rounded-md border border-red-300 bg-red-50/95 px-2.5 py-1.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Determines the effective rendering kind of a LoopItemField row, using
 * row overrides (`row.fieldType`, `row.textMode`, `row.urlMode`, `row.multiple`),
 * explicit field metadata (`__fieldMeta` on item.raw or `loopPreview.fields`),
 * and value/key heuristics.
 */
export type EffectiveLoopFieldKind =
  | 'title'
  | 'excerpt'
  | 'richtext'
  | 'image'
  | 'gallery'
  | 'date'
  | 'author'
  | 'authorImage'
  | 'terms'
  | 'permalink'
  | 'url'
  | 'video'
  | 'embed'
  | 'bookmark'
  | 'boolean'
  | 'number'
  | 'select'
  | 'array'
  | 'text';

export function resolveEffectiveFieldKind(
  row: LoopItemFieldRow,
  fieldMeta?: {
    label?: string;
    type?: string;
    fieldType?: string;
    config?: unknown;
  },
  rawVal?: unknown
): EffectiveLoopFieldKind {
  const field = row.field ?? 'title';
  if (field === 'title') return 'title';
  if (field === 'excerpt') return 'excerpt';
  if (field === 'image') return 'image';
  if (field === 'publishedAt') return 'date';
  if (field === 'author') return 'author';
  if (field === 'terms') return 'terms';
  if (field === 'readMore') return 'permalink';
  if (field === 'bookmark') return 'bookmark';

  const key = (row.customKey ?? '').trim();

  // 1. Check explicit row-level fieldType & view mode overrides first
  const explicitType =
    row.fieldType && row.fieldType !== 'auto' ? row.fieldType : undefined;
  if (explicitType) {
    if (explicitType === 'array') return 'array';
    if (explicitType === 'richtext') return 'richtext';
    if (explicitType === 'date') return 'date';
    if (explicitType === 'boolean') return 'boolean';
    if (explicitType === 'number') return 'number';
    if (explicitType === 'select') return 'select';
    if (explicitType === 'media') {
      if (row.multiple || Array.isArray(rawVal)) return 'gallery';
      return 'image';
    }
    if (explicitType === 'url') {
      if (row.urlMode === 'video') return 'video';
      return 'url';
    }
    if (explicitType === 'text') {
      if (row.textMode === 'video') return 'video';
      if (row.textMode === 'embed') return 'embed';
      return 'text';
    }
  }

  if (!key) return 'text';

  // Built-in item keys selectable under Custom / Collection Field
  if (key === 'url' || key === 'permalink' || key === 'readMore')
    return 'permalink';
  if (key === 'image' || key === 'featuredImage') return 'image';
  if (key === 'authorImage') return 'authorImage';
  if (key === 'authorName' || key === 'author') return 'author';
  if (key === 'publishedAt') return 'date';
  if (key === 'terms' || key === 'category' || key === 'tags') return 'terms';
  if (key === 'excerpt') return 'excerpt';

  // 2. Explicit collection / external API field metadata check
  const fType = fieldMeta?.fieldType ?? fieldMeta?.type;
  const cfg = fieldMeta?.config as Record<string, unknown> | undefined;
  if (fType === 'array') return 'array';
  if (fType === 'permalink') return 'permalink';
  if (fType === 'author') return 'author';
  if (fType === 'terms') return 'terms';
  if (fType === 'excerpt') return 'excerpt';
  if (fType === 'richtext') return 'richtext';
  if (fType === 'date') return 'date';
  if (fType === 'boolean') return 'boolean';
  if (fType === 'number') return 'number';
  if (fType === 'select') return 'select';
  if (fType === 'media' || fType === 'image') {
    const mediaCfg = readMediaFieldConfig(cfg);
    if (row.multiple || mediaCfg.multiple || Array.isArray(rawVal))
      return 'gallery';
    return 'image';
  }
  if (fType === 'url') {
    if (row.urlMode === 'video' || readUrlFieldMode(cfg) === 'video')
      return 'video';
    return 'url';
  }
  if (fType === 'text') {
    const textMode = row.textMode ?? readTextFieldMode(cfg);
    if (textMode === 'video') return 'video';
    if (textMode === 'embed') return 'embed';
  }

  // 3. Value & key heuristic fallbacks (when metadata is absent or generic)
  if (Array.isArray(rawVal)) {
    if (Array.isArray(row.nestedFields) && row.nestedFields.length > 0) {
      return 'array';
    }
    if (
      entryMediaValues(rawVal).length > 0 &&
      rawVal.every(
        v =>
          typeof v === 'string' &&
          (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|#|$)/i.test(v) ||
            v.includes('images.unsplash.com/'))
      )
    ) {
      return 'gallery';
    }
    return 'array';
  }
  if (
    key === 'gallery' ||
    key === 'screenshots' ||
    key === 'images' ||
    key === 'photos'
  ) {
    return 'gallery';
  }
  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim();
    if (/^<iframe\b/i.test(trimmed) && parseEmbedInput(trimmed)) return 'embed';
    if (
      (key === 'embed' || key.endsWith('_embed')) &&
      parseEmbedInput(trimmed)
    ) {
      return 'embed';
    }
    if (
      (key === 'video' || key === 'videoUrl' || key.endsWith('_video')) &&
      parseVideoUrl(trimmed)
    ) {
      return 'video';
    }
    if (
      parseVideoUrl(trimmed) &&
      (trimmed.includes('youtube.com/watch') ||
        trimmed.includes('youtu.be/') ||
        trimmed.includes('vimeo.com/') ||
        /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(trimmed))
    ) {
      return 'video';
    }
    if (
      key === 'screenshot' ||
      key === 'photo' ||
      key === 'avatar' ||
      key === 'thumbnail' ||
      key === 'cover' ||
      key === 'hero' ||
      /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|#|$)/i.test(trimmed) ||
      trimmed.includes('images.unsplash.com/')
    ) {
      return 'image';
    }
    if (
      /<\/?(p|div|ul|ol|li|h[1-6]|blockquote|strong|em|br|article|section)\b/i.test(
        trimmed
      )
    ) {
      return 'richtext';
    }
    if (
      (key === 'website' ||
        key === 'linkedin' ||
        key.endsWith('_url') ||
        key.endsWith('Url')) &&
      isValidGeneralUrl(trimmed)
    ) {
      return 'url';
    }
    if (
      (key === 'launched' ||
        key === 'released' ||
        key === 'createdAt' ||
        key === 'updatedAt' ||
        key.endsWith('Date') ||
        key.endsWith('_at')) &&
      /^\d{4}-\d{2}-\d{2}/.test(trimmed)
    ) {
      return 'date';
    }
  } else if (typeof rawVal === 'boolean') {
    return 'boolean';
  } else if (typeof rawVal === 'number') {
    return 'number';
  }

  // Known key names even when rawVal is empty (e.g. in inspector `when` checks)
  if (key === 'embed' || key.endsWith('_embed')) return 'embed';
  if (key === 'video' || key === 'videoUrl' || key.endsWith('_video'))
    return 'video';
  if (
    key === 'screenshot' ||
    key === 'photo' ||
    key === 'avatar' ||
    key === 'thumbnail' ||
    key === 'cover' ||
    key === 'hero'
  ) {
    return 'image';
  }
  if (
    key === 'summary' ||
    key === 'bio' ||
    key === 'highlights' ||
    key === 'quote' ||
    key === 'answer'
  ) {
    return 'richtext';
  }
  if (
    key === 'website' ||
    key === 'linkedin' ||
    key.endsWith('_url') ||
    key.endsWith('Url')
  ) {
    return 'url';
  }
  if (
    key === 'launched' ||
    key === 'released' ||
    key === 'createdAt' ||
    key === 'updatedAt'
  ) {
    return 'date';
  }
  if (key === 'title' || key === 'name') return 'title';

  return 'text';
}

/** Interactive Featured Image + Slider view for multi-image galleries in Loop cards. */
function LoopFeaturedGallerySlider({
  images,
  alt,
  itemUrl,
  linkToItem,
  showFeaturedPill,
  showGalleryBadge,
  galleryBadgePosition = 'top-right',
  galleryAspect = 'wide',
  popupTrigger,
  overlayId,
  loopItem,
  badgeElements,
  className,
  style,
}: {
  images: string[];
  alt: string;
  itemUrl: string;
  linkToItem?: boolean;
  showFeaturedPill?: boolean;
  showGalleryBadge?: boolean;
  galleryBadgePosition?: GalleryBadgePosition;
  galleryAspect?: GalleryAspect;
  popupTrigger?: boolean;
  overlayId?: string;
  /** The card's item, so a popup opened from the image can show its data. */
  loopItem?: unknown;
  badgeElements?: Record<string, ElementStyle>;
  className?: string;
  style?: CSSProperties;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = images.length;
  const currentIdx = count > 0 ? Math.min(activeIndex, count - 1) : 0;
  const currentSrc = images[currentIdx] ?? '';
  const hasMulti = count > 1;

  const aspectClass =
    galleryAspect === 'square'
      ? 'aspect-square'
      : galleryAspect === 'landscape'
        ? 'aspect-[4/3]'
        : galleryAspect === 'portrait'
          ? 'aspect-[3/4]'
          : galleryAspect === 'tall'
            ? 'aspect-[4/5]'
            : 'aspect-video';

  const imgNode = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={`${alt} ${currentIdx + 1}`}
      loading="lazy"
      className={cn(
        'size-full object-cover transition-transform duration-300 group-hover/gallery:scale-[1.02]',
        aspectClass,
        className
      )}
      style={style}
    />
  );

  const mainTrigger =
    popupTrigger && overlayId ? (
      <OverlayTrigger
        overlayId={overlayId}
        lightbox={{ image: currentSrc, alt: `${alt} ${currentIdx + 1}` }}
        loopItem={loopItem}
        className="block w-full overflow-hidden"
      >
        {imgNode}
      </OverlayTrigger>
    ) : linkToItem ? (
      <a href={itemUrl} className="block w-full overflow-hidden">
        {imgNode}
      </a>
    ) : (
      <div className="w-full overflow-hidden">{imgNode}</div>
    );

  return (
    <div
      className="group/gallery relative overflow-hidden rounded-lg"
      data-loop-gallery-slider=""
    >
      {mainTrigger}

      {showFeaturedPill && currentIdx === 0 && hasMulti && (
        <span className="pointer-events-none absolute start-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          Featured
        </span>
      )}

      <GalleryBadge
        show={showGalleryBadge !== false}
        hasGallery={hasMulti}
        count={count}
        position={galleryBadgePosition}
        elements={badgeElements}
      />

      {hasMulti && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((currentIdx - 1 + count) % count);
            }}
            className="absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white opacity-85 shadow-sm backdrop-blur-sm transition hover:bg-black/80 group-hover/gallery:opacity-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((currentIdx + 1) % count);
            }}
            className="absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white opacity-85 shadow-sm backdrop-blur-sm transition hover:bg-black/80 group-hover/gallery:opacity-100"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className=" absolute bottom-2.5 start-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
            {images.map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                type="button"
                aria-label={`View slide ${idx + 1}`}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === currentIdx
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/55 hover:bg-white/85'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Converts an ExternalApiFieldMapping / ExternalApiNestedFieldMapping into a LoopItemFieldRow. */
export function apiFieldMappingToLoopRow(
  mapping: ExternalApiFieldMapping | ExternalApiNestedFieldMapping
): LoopItemFieldRow {
  const isTopArray = 'arrayLayout' in mapping || mapping.fieldType === 'array';
  return {
    field: 'custom',
    customKey: mapping.key,
    fieldType: mapping.fieldType,
    textMode: mapping.textMode,
    urlMode: mapping.urlMode,
    multiple: mapping.multiple,
    isFeatured: mapping.isFeatured,
    ...(isTopArray
      ? {
          arrayLayout: (mapping as ExternalApiFieldMapping).arrayLayout,
          nestedFields: (mapping as ExternalApiFieldMapping).nestedFields,
        }
      : {}),
    showLabel: mapping.showLabel ?? false,
    labelText: mapping.label ?? '',
    textSize: mapping.textSize ?? 'auto',
    linkToItem: mapping.linkToItem ?? false,
    urlDisplay: mapping.urlDisplay ?? 'link',
    urlLinkText: mapping.urlLinkText ?? '',
    urlNewTab: mapping.urlNewTab ?? true,
    showArrow: mapping.showArrow ?? true,
    dateFormat: mapping.dateFormat ?? 'medium',
    datePrefix: mapping.datePrefix ?? '',
    maxLines: mapping.maxLines ?? 'none',
    stripHtml: mapping.stripHtml ?? false,
    imageAspect: mapping.imageAspect ?? 'video',
    galleryViewMode:
      (mapping.galleryViewMode as LoopGalleryViewMode | undefined) ??
      'featured-slider',
    galleryAspect: mapping.galleryAspect ?? 'wide',
    popupTrigger: mapping.popupTrigger,
    overlayId: mapping.overlayId,
    posterUrl: mapping.posterUrl,
  };
}

/** Extracts normalized rows from `props.items` or legacy single-field props. */
export function rowsOfLoopItemField(
  props: LoopItemFieldProps
): LoopItemFieldRow[] {
  const list = Array.isArray(props.items)
    ? props.items.filter(item => item && typeof item === 'object')
    : [];
  if (list.length > 0) return list;

  return [
    {
      field: props.field ?? 'title',
      customKey: props.customKey ?? '',
      fieldType: props.fieldType,
      textMode: props.textMode,
      urlMode: props.urlMode,
      multiple: props.multiple,
      isFeatured: props.isFeatured,
      arrayLayout: props.arrayLayout,
      nestedFields: props.nestedFields,
      showLabel: props.showLabel ?? false,
      labelText: props.labelText ?? '',
      textSize: props.textSize ?? 'auto',
      linkToItem: props.linkToItem ?? true,
      readMoreLabel: props.readMoreLabel ?? 'Read more',
      urlDisplay: props.urlDisplay ?? 'link',
      urlLinkText: props.urlLinkText ?? '',
      urlNewTab: props.urlNewTab,
      urlConfig: props.urlConfig,
      showArrow: props.showArrow ?? true,
      dateFormat: props.dateFormat ?? 'medium',
      datePrefix: props.datePrefix ?? '',
      authorDisplay: props.authorDisplay ?? 'name',
      authorPrefix: props.authorPrefix ?? '',
      termsDisplay: props.termsDisplay ?? 'plain',
      termsTaxonomy: props.termsTaxonomy ?? 'all',
      maxLines: props.maxLines ?? 'none',
      stripHtml: props.stripHtml ?? false,
      imageAspect: props.imageAspect ?? 'video',
      showGalleryBadge: props.showGalleryBadge ?? true,
      galleryBadgePosition: props.galleryBadgePosition ?? 'top-right',
      galleryViewMode: props.galleryViewMode ?? 'featured-slider',
      galleryStyle: props.galleryStyle ?? 'facebook',
      galleryAspect: props.galleryAspect ?? 'wide',
      excludeFeaturedImage: props.excludeFeaturedImage ?? false,
      popupTrigger: props.popupTrigger,
      overlayId: props.overlayId,
      posterUrl: props.posterUrl,
      motion: props.motion,
      style: props.style,
      labelStyle: props.labelStyle,
      badgeStyle: props.badgeStyle,
    },
  ];
}

export function isExternalHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Allows only `http(s):` and relative URLs (`/`, `./`, `../`, `?`, `#`).
 * Rejects `javascript:`, `data:`, `vbscript:`, etc.
 */
export function sanitizeLoopUrl(
  rawUrl: string | null | undefined,
  fallback = '#'
): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return fallback;
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('?') ||
    trimmed.startsWith('#')
  ) {
    // Reject protocol-relative `//evil.tld` if someone didn't intend it?
    // Wait: `//` can be protocol-relative, so only allow single `/` or relative paths.
    if (trimmed.startsWith('//')) return fallback;
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // Relative path without leading slash (e.g. `posts/hello`) if it has no scheme colon
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return trimmed;
    }
  }
  return fallback;
}

function resolveLoopItemHref(
  item: (typeof SAMPLE_LOOP_ITEMS)[number],
  row: LoopItemFieldRow
): string {
  const sp = row.singlePageUrl?.trim();
  if (sp) {
    const encodedId = encodeURIComponent(String(item.id ?? ''));
    const raw = sp.includes('{{id}}')
      ? sp.replaceAll('{{id}}', encodedId)
      : `${sp}${sp.includes('?') ? '&' : '?'}itemId=${encodedId}`;
    return sanitizeLoopUrl(raw, '#');
  }
  return sanitizeLoopUrl(item.url, '#');
}

function LoopItemFieldRowView({
  row,
  item,
  previewFields,
  language,
  align,
  editing,
  legacyElements,
}: {
  row: LoopItemFieldRow;
  item: (typeof SAMPLE_LOOP_ITEMS)[number];
  previewFields: LoopItemFieldOption[];
  language: string;
  align: LoopAlign;
  editing?: boolean;
  legacyElements?: Record<string, ElementStyle>;
}): ReactNode {
  const customKey = (row.customKey ?? '').trim();
  if (row.field === 'custom' && customKey.includes(',')) {
    const keys = customKey
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (keys.length > 1) {
      const multiLayout: LoopMultiFieldLayout = row.multiLayout ?? 'stack';

      if (multiLayout === 'table') {
        return (
          <div
            className="s-border s-radius overflow-hidden border"
            data-loop-multi-fields={keys.join(',')}
            data-loop-multi-layout="table"
          >
            <table className="w-full border-collapse text-start text-sm">
              <tbody>
                {keys.map(k => {
                  const meta = previewFields.find(f => f.path === k);
                  const lbl =
                    meta?.label ??
                    k
                      .split('.')
                      .pop()
                      ?.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                      .replace(/[_-]+/g, ' ')
                      .replace(/\b\w/g, c => c.toUpperCase()) ??
                    k;
                  return (
                    <tr
                      key={k}
                      className="s-border border-b last:border-b-0"
                    >
                      <th className="s-muted w-1/3 px-3 py-1.5 text-xs font-medium">
                        {lbl}
                      </th>
                      <td className="px-3 py-1.5">
                        <LoopItemFieldRowView
                          row={{ ...row, customKey: k, showLabel: false }}
                          item={item}
                          previewFields={previewFields}
                          language={language}
                          align={align}
                          editing={editing}
                          legacyElements={legacyElements}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      if (multiLayout === 'list') {
        return (
          <ul
            className="flex list-disc flex-col gap-1 ps-5"
            data-loop-multi-fields={keys.join(',')}
            data-loop-multi-layout="list"
          >
            {keys.map(k => (
              <li key={k}>
                <LoopItemFieldRowView
                  row={{ ...row, customKey: k }}
                  item={item}
                  previewFields={previewFields}
                  language={language}
                  align={align}
                  editing={editing}
                  legacyElements={legacyElements}
                />
              </li>
            ))}
          </ul>
        );
      }

      if (multiLayout === 'badges') {
        return (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              align === 'center' && 'justify-center',
              align === 'right' && 'justify-end'
            )}
            data-loop-multi-fields={keys.join(',')}
            data-loop-multi-layout="badges"
          >
            {keys.map(k => (
              <span
                key={k}
                className="s-surface s-border s-radius inline-flex items-center border px-2.5 py-0.5 text-xs font-medium"
              >
                <LoopItemFieldRowView
                  row={{ ...row, customKey: k }}
                  item={item}
                  previewFields={previewFields}
                  language={language}
                  align={align}
                  editing={editing}
                  legacyElements={legacyElements}
                />
              </span>
            ))}
          </div>
        );
      }

      if (multiLayout === 'inline') {
        return (
          <div
            className={cn(
              'flex flex-wrap items-baseline gap-x-1.5 gap-y-1',
              align === 'center' && 'justify-center',
              align === 'right' && 'justify-end'
            )}
            data-loop-multi-fields={keys.join(',')}
            data-loop-multi-layout="inline"
          >
            {keys.map((k, idx) => (
              <span key={k} className="inline-flex items-baseline gap-1.5">
                <LoopItemFieldRowView
                  row={{ ...row, customKey: k }}
                  item={item}
                  previewFields={previewFields}
                  language={language}
                  align={align}
                  editing={editing}
                  legacyElements={legacyElements}
                />
                {idx < keys.length - 1 && (
                  <span className="s-muted" aria-hidden="true">
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        );
      }

      const containerClass =
        multiLayout === 'row'
          ? cn(
              'flex flex-wrap items-center gap-3',
              align === 'center' && 'justify-center',
              align === 'right' && 'justify-end'
            )
          : multiLayout === 'grid' || multiLayout === 'cards'
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
            : 'flex flex-col gap-1.5';

      return (
        <div
          className={containerClass}
          data-loop-multi-fields={keys.join(',')}
          data-loop-multi-layout={multiLayout}
        >
          {keys.map(k =>
            multiLayout === 'cards' ? (
              <div
                key={k}
                className="s-surface s-border s-radius border p-2.5"
              >
                <LoopItemFieldRowView
                  row={{ ...row, customKey: k }}
                  item={item}
                  previewFields={previewFields}
                  language={language}
                  align={align}
                  editing={editing}
                  legacyElements={legacyElements}
                />
              </div>
            ) : (
              <LoopItemFieldRowView
                key={k}
                row={{ ...row, customKey: k }}
                item={item}
                previewFields={previewFields}
                language={language}
                align={align}
                editing={editing}
                legacyElements={legacyElements}
              />
            )
          )}
        </div>
      );
    }
  }
  const rawMetaMap = (item.raw?.__fieldMeta ?? {}) as Record<
    string,
    { label?: string; type?: string; config?: Record<string, unknown> }
  >;
  const previewMeta = customKey
    ? previewFields.find(f => f.path === customKey)
    : undefined;
  const itemMeta = customKey ? rawMetaMap[customKey] : undefined;
  const fieldMeta =
    itemMeta || previewMeta
      ? {
          label: itemMeta?.label ?? previewMeta?.label,
          type: itemMeta?.type ?? previewMeta?.fieldType ?? previewMeta?.type,
          fieldType: previewMeta?.fieldType ?? itemMeta?.type,
          config: itemMeta?.config ?? previewMeta?.config,
        }
      : undefined;

  const rawVal = customKey
    ? customKey === '.'
      ? (item.raw?.['.'] ?? item.raw)
      : (readPath(item.raw, customKey) ?? readPath(item, customKey))
    : undefined;

  const kind = resolveEffectiveFieldKind(row, fieldMeta, rawVal);

  // Merge legacy block-level elements (`value`, `image`, `link`, `galleryBadge`) with per-row style
  const legacyKey =
    kind === 'image' || kind === 'gallery'
      ? 'image'
      : kind === 'permalink' || kind === 'url'
        ? 'link'
        : 'value';
  const mergedValueElementStyle: ElementStyle | undefined =
    row.style && Object.keys(row.style).length > 0
      ? row.style
      : (legacyElements?.[legacyKey] ?? legacyElements?.value);
  const valueStyle = styleOf(mergedValueElementStyle);
  const labelStyle = styleOf(row.labelStyle);
  const badgeElements: Record<string, ElementStyle> | undefined =
    row.badgeStyle && Object.keys(row.badgeStyle).length > 0
      ? { ...legacyElements, galleryBadge: row.badgeStyle }
      : legacyElements;
  const styledForLegacy = {
    elements: mergedValueElementStyle
      ? { ...legacyElements, [legacyKey]: mergedValueElementStyle }
      : legacyElements,
  };

  const defaultLabel =
    row.field === 'custom'
      ? (fieldMeta?.label ?? humanizeKey(customKey))
      : row.field === 'publishedAt'
        ? 'Published'
        : row.field === 'author'
          ? 'Author'
          : row.field === 'terms'
            ? 'Terms'
            : humanizeKey(row.field ?? '');
  const label = row.labelText?.trim() || defaultLabel;
  const showLabel = Boolean(row.showLabel && label && kind !== 'bookmark');

  const wrapWithLabel = (node: ReactNode): ReactNode => {
    if (!node) return null;
    if (!showLabel) return node;
    return (
      <div className="min-w-0 space-y-1">
        <span
          className={cn(
            'block text-xs font-semibold uppercase tracking-wider s-muted',
            ...labelStyle.classes
          )}
          style={labelStyle.style}
        >
          {label}
        </span>
        {node}
      </div>
    );
  };

  const hasEntryGallery = listingItemHasGallery(item);

  switch (kind) {
    case 'array': {
      const cfg = (fieldMeta?.config ?? {}) as Record<string, unknown>;
      const nestedFields =
        row.nestedFields ??
        (Array.isArray(cfg.nestedFields)
          ? (cfg.nestedFields as ExternalApiNestedFieldMapping[])
          : []);
      const arrayLayout: ExternalApiArrayLayout =
        row.arrayLayout ??
        (typeof cfg.arrayLayout === 'string'
          ? (cfg.arrayLayout as ExternalApiArrayLayout)
          : 'cards');

      if (!Array.isArray(rawVal) || rawVal.length === 0) {
        return editing ? (
          <div className="rounded-lg border border-dashed px-3 py-2 text-xs s-muted">
            [Empty array for {label || customKey || 'list'}]
          </div>
        ) : null;
      }

      if (arrayLayout === 'badges') {
        const subKey = nestedFields[0]?.key || '.';
        return wrapWithLabel(
          <div className="flex flex-wrap gap-1.5">
            {rawVal.map((elVal, idx) => {
              const extracted =
                elVal && typeof elVal === 'object' && subKey !== '.'
                  ? extractNestedValue(elVal, subKey)
                  : elVal;
              if (extracted === null || extracted === undefined || extracted === '')
                return null;
              const text =
                typeof extracted === 'object'
                  ? JSON.stringify(extracted)
                  : String(extracted);
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: array item order
                  key={idx}
                  className={cn(
                    's-primary-text inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-medium',
                    ...valueStyle.classes
                  )}
                  style={valueStyle.style}
                >
                  {text}
                </span>
              );
            })}
          </div>
        );
      }

      const effectiveNested: ExternalApiNestedFieldMapping[] =
        nestedFields.length > 0
          ? nestedFields
          : (() => {
              const first = rawVal.find(v => v !== null && v !== undefined);
              if (first && typeof first === 'object' && !Array.isArray(first)) {
                return Object.keys(first as Record<string, unknown>)
                  .slice(0, 4)
                  .map(k => ({
                    key: k,
                    label: humanizeKey(k),
                    showLabel: true,
                    fieldType: 'text' as const,
                    textMode: 'plain' as const,
                  }));
              }
              return [
                {
                  key: '.',
                  label: label || 'Item',
                  showLabel: false,
                  fieldType: 'text' as const,
                  textMode: 'plain' as const,
                },
              ];
            })();

      const containerClass =
        arrayLayout === 'grid'
          ? 'grid gap-3 sm:grid-cols-2'
          : arrayLayout === 'row'
            ? 'flex flex-wrap items-start gap-3'
            : arrayLayout === 'list'
              ? 'list-disc space-y-1.5 ps-5'
              : 'space-y-2.5';

      const itemsNodes = rawVal.map((elVal, elIdx) => {
        const subRawRecord: Record<string, unknown> =
          elVal && typeof elVal === 'object' && !Array.isArray(elVal)
            ? { ...(elVal as Record<string, unknown>), '.': elVal }
            : { '.': elVal };

        const syntheticSubItem: (typeof SAMPLE_LOOP_ITEMS)[number] = {
          ...item,
          id: `${item.id}-arr-${elIdx}`,
          raw: subRawRecord,
        };

        const renderedSubFields = effectiveNested
          .map((nf, nfIdx) => {
            const subRow = apiFieldMappingToLoopRow(nf);
            return (
              <LoopItemFieldRowView
                // biome-ignore lint/suspicious/noArrayIndexKey: nested field order
                key={nfIdx}
                row={subRow}
                item={syntheticSubItem}
                previewFields={[]}
                language={language}
                align={align}
                editing={editing}
                legacyElements={legacyElements}
              />
            );
          })
          .filter(Boolean);

        if (renderedSubFields.length === 0) return null;

        if (arrayLayout === 'list') {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: array element index
            <li key={elIdx} className="space-y-1 text-sm">
              {renderedSubFields}
            </li>
          );
        }

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: array element index
            key={elIdx}
            className={cn(
              arrayLayout === 'cards'
                ? 's-surface s-border s-radius space-y-1.5 rounded-lg border p-3 shadow-2xs'
                : 'space-y-1'
            )}
          >
            {renderedSubFields}
          </div>
        );
      });

      const WrapperTag = arrayLayout === 'list' ? 'ul' : 'div';
      return wrapWithLabel(
        <WrapperTag className={containerClass} data-loop-array-repeater={customKey}>
          {itemsNodes}
        </WrapperTag>
      );
    }

    case 'image': {
      const isFeaturedImage =
        row.field === 'image' ||
        customKey === 'image' ||
        row.isFeatured === true ||
        Boolean(readMediaFieldConfig(fieldMeta?.config).isFeatured);
      const customUrls = entryMediaValues(rawVal);
      const imgSrc =
        row.field === 'image' || customKey === 'image'
          ? (item.image ?? customUrls[0] ?? null)
          : (customUrls[0] ??
            (typeof rawVal === 'string' && rawVal.trim()
              ? rawVal.trim()
              : isFeaturedImage
                ? (item.image ?? null)
                : null));

      if (!imgSrc) {
        return editing ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed text-xs s-muted">
            [No image for {label || 'item'}]
          </div>
        ) : null;
      }

      if (editing && !isValidGeneralUrl(imgSrc)) {
        return wrapWithLabel(
          <BuilderValidationBanner
            message={`Invalid image URL for "${label || customKey}": ${GENERAL_URL_ERROR}`}
          />
        );
      }

      const aspectClass =
        IMAGE_ASPECT_CLASS[row.imageAspect ?? 'video'] ?? 'aspect-video';
      const imageEl = el(
        styledForLegacy,
        'image',
        cn(aspectClass, 'size-full object-cover')
      );
      const showBadge =
        isFeaturedImage && row.showGalleryBadge !== false && hasEntryGallery;

      const inner = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={item.title}
            loading="lazy"
            className={imageEl.className}
            style={imageEl.style}
          />
          <GalleryBadge
            show={showBadge}
            hasGallery={hasEntryGallery}
            count={item.galleryCount}
            position={row.galleryBadgePosition ?? 'top-right'}
            elements={badgeElements}
          />
        </>
      );

      let mediaNode: ReactNode;
      if (row.popupTrigger && row.overlayId) {
        mediaNode = (
          <OverlayTrigger
            overlayId={row.overlayId}
            className="relative block overflow-hidden"
            lightbox={{ image: imgSrc, alt: item.title }}
            loopItem={item}
          >
            {inner}
          </OverlayTrigger>
        );
      } else if (row.linkToItem !== false) {
        mediaNode = (
          <a href={item.url} className="relative block overflow-hidden">
            {inner}
          </a>
        );
      } else {
        mediaNode = <div className="relative overflow-hidden">{inner}</div>;
      }

      if (hasActiveMotion(row.motion)) {
        mediaNode = (
          <div className="overflow-hidden">
            <div data-motion={JSON.stringify(row.motion)}>{mediaNode}</div>
          </div>
        );
      }

      return wrapWithLabel(mediaNode);
    }

    case 'gallery': {
      const fieldUrls = entryMediaValues(rawVal);
      const shouldExcludeFeatured = Boolean(row.excludeFeaturedImage);
      const galleryImages = shouldExcludeFeatured
        ? item.image
          ? fieldUrls.filter(u => u !== item.image)
          : fieldUrls
        : mergeFeaturedWithFieldMedia(rawVal, item.image ?? null);

      if (galleryImages.length === 0) {
        return editing ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed text-xs s-muted">
            [No gallery images for {label || 'Gallery'}]
          </div>
        ) : null;
      }

      const hasMulti = galleryImages.length > 1 || hasEntryGallery;
      const viewMode: LoopGalleryViewMode =
        row.galleryViewMode ?? row.galleryStyle ?? 'featured-slider';
      const aspect = row.galleryAspect ?? 'wide';

      if (viewMode === 'featured-slider') {
        return wrapWithLabel(
          <LoopFeaturedGallerySlider
            images={galleryImages}
            alt={item.title}
            itemUrl={item.url}
            linkToItem={row.linkToItem ?? false}
            showFeaturedPill={!shouldExcludeFeatured && Boolean(item.image)}
            showGalleryBadge={row.showGalleryBadge !== false}
            galleryBadgePosition={row.galleryBadgePosition ?? 'top-right'}
            galleryAspect={aspect}
            popupTrigger={row.popupTrigger}
            overlayId={row.overlayId}
            loopItem={item}
            badgeElements={badgeElements}
            className={cn(...valueStyle.classes)}
            style={valueStyle.style}
          />
        );
      }

      if (viewMode === 'featured-badge') {
        const firstImg = sanitizeLoopUrl(galleryImages[0], '');
        if (!firstImg) return null;
        const aspectClass =
          aspect === 'square'
            ? 'aspect-square'
            : aspect === 'landscape'
              ? 'aspect-[4/3]'
              : aspect === 'portrait'
                ? 'aspect-[3/4]'
                : aspect === 'tall'
                  ? 'aspect-[4/5]'
                  : 'aspect-video';
        const imgNode = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firstImg}
              alt={item.title}
              loading="lazy"
              className={cn(
                'size-full object-cover',
                aspectClass,
                ...valueStyle.classes
              )}
              style={valueStyle.style}
            />
            <GalleryBadge
              show={row.showGalleryBadge !== false}
              hasGallery={hasMulti}
              count={galleryImages.length}
              position={row.galleryBadgePosition ?? 'top-right'}
              elements={badgeElements}
            />
          </>
        );
        const itemHref = resolveLoopItemHref(item, row);
        return wrapWithLabel(
          row.popupTrigger && row.overlayId ? (
            <OverlayTrigger
              overlayId={row.overlayId}
              loopItem={item}
              className="relative block overflow-hidden rounded-lg"
            >
              {imgNode}
            </OverlayTrigger>
          ) : row.linkToItem !== false || Boolean(row.singlePageUrl?.trim()) ? (
            <a
              href={itemHref}
              rel={isExternalHttpUrl(itemHref) ? 'noopener noreferrer' : undefined}
              className="relative block overflow-hidden rounded-lg"
            >
              {imgNode}
            </a>
          ) : (
            <div className="relative overflow-hidden rounded-lg">{imgNode}</div>
          )
        );
      }

      return wrapWithLabel(
        <div className="relative overflow-hidden rounded-lg">
          <CollectionGallery
            images={galleryImages}
            alt={item.title}
            galleryStyle={viewMode}
            galleryAspect={aspect}
            enableLightbox={!(row.popupTrigger && row.overlayId)}
            showFeaturedBadge={!shouldExcludeFeatured}
            overlayId={
              row.popupTrigger && row.overlayId ? row.overlayId : undefined
            }
            className={cn(...valueStyle.classes)}
            style={valueStyle.style}
          />
          <GalleryBadge
            show={row.showGalleryBadge !== false}
            hasGallery={hasMulti}
            count={galleryImages.length}
            position={row.galleryBadgePosition ?? 'top-right'}
            elements={badgeElements}
          />
        </div>
      );
    }

    case 'title': {
      const titleText =
        row.field === 'custom' && typeof rawVal === 'string' && rawVal.trim()
          ? rawVal.trim()
          : item.title;
      if (!titleText) return null;

      const size = row.textSize && row.textSize !== 'auto' ? row.textSize : null;
      const Tag = size ? SIZE_TAG[size] : 'h3';
      const baseClass = size
        ? SIZE_CLASS[size]
        : 'text-lg font-bold leading-snug';
      const titleEl = el(styledForLegacy, 'value', baseClass);

      const titleHref = resolveLoopItemHref(item, row);
      return wrapWithLabel(
        <Tag className={titleEl.className} style={titleEl.style}>
          {row.popupTrigger && row.overlayId ? (
            <OverlayTrigger
              overlayId={row.overlayId}
              loopItem={item}
              className="hover:underline"
            >
              {titleText}
            </OverlayTrigger>
          ) : row.linkToItem !== false || Boolean(row.singlePageUrl?.trim()) ? (
            <a
              href={titleHref}
              rel={
                isExternalHttpUrl(titleHref) ? 'noopener noreferrer' : undefined
              }
              className="hover:underline"
            >
              {titleText}
            </a>
          ) : (
            titleText
          )}
        </Tag>
      );
    }

    case 'excerpt':
    case 'richtext': {
      const rawText =
        kind === 'excerpt'
          ? (item.excerpt ??
            (typeof rawVal === 'string' ? rawVal : '') ??
            (typeof item.raw?.summary === 'string' ? item.raw.summary : ''))
          : typeof rawVal === 'string'
            ? rawVal
            : (item.excerpt ?? '');

      if (!rawText) {
        return editing && kind === 'richtext' ? (
          <p className="s-muted text-xs">[{label || 'Rich text'}]</p>
        ) : null;
      }

      const maxLines =
        row.maxLines ?? (kind === 'excerpt' ? '3' : 'none');
      const clampClass =
        maxLines !== 'none' ? LINE_CLAMP_CLASS[maxLines] : '';
      const hasHtml = /<\/?[a-z][\s\S]*>/i.test(rawText);

      if (hasHtml && !row.stripHtml) {
        const proseEl = el(
          styledForLegacy,
          'value',
          cn(
            's-prose prose prose-sm max-w-none text-sm leading-relaxed text-[var(--site-fg)] [&>p]:mb-2 [&>p:last-child]:mb-0',
            clampClass
          )
        );
        return wrapWithLabel(
          <div
            className={proseEl.className}
            style={proseEl.style}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via sanitizeRichText
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(rawText) }}
          />
        );
      }

      const plainText = hasHtml
        ? rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : rawText;
      const excerptEl = el(
        styledForLegacy,
        'value',
        cn('s-muted text-sm leading-relaxed', clampClass || 'line-clamp-3')
      );
      return wrapWithLabel(
        <p className={excerptEl.className} style={excerptEl.style}>
          {plainText}
        </p>
      );
    }

    case 'date': {
      const rawDate =
        row.field === 'publishedAt' || customKey === 'publishedAt'
          ? item.publishedAt
          : typeof rawVal === 'string'
            ? rawVal
            : item.publishedAt;
      const formatted = formatLoopDate(
        rawDate,
        language,
        row.dateFormat ?? 'medium'
      );
      if (!formatted) {
        return editing ? (
          <span className="s-muted text-xs">[{label || 'Date'}]</span>
        ) : null;
      }
      const dateEl = el(styledForLegacy, 'value', 's-muted text-xs');
      return wrapWithLabel(
        <time
          dateTime={rawDate ?? undefined}
          className={dateEl.className}
          style={dateEl.style}
        >
          {row.datePrefix ? `${row.datePrefix}${formatted}` : formatted}
        </time>
      );
    }

    case 'authorImage': {
      const authorImg =
        item.author?.image ||
        (typeof item.raw?.authorImage === 'string'
          ? item.raw.authorImage
          : '') ||
        (typeof item.raw?.avatar === 'string' ? item.raw.avatar : '');
      const authorName =
        item.author?.name ||
        (typeof item.raw?.authorName === 'string'
          ? item.raw.authorName
          : '') ||
        (typeof item.raw?.author === 'string' ? item.raw.author : '');

      if (authorImg) {
        return wrapWithLabel(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authorImg}
            alt={authorName || 'Author'}
            className={cn(
              'size-8 rounded-full object-cover',
              ...valueStyle.classes
            )}
            style={valueStyle.style}
          />
        );
      }
      if (authorName) {
        return wrapWithLabel(
          <span
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary',
              ...valueStyle.classes
            )}
            style={valueStyle.style}
          >
            {authorName.charAt(0).toUpperCase()}
          </span>
        );
      }
      return null;
    }

    case 'author': {
      const authorName =
        item.author?.name ||
        (typeof item.raw?.authorName === 'string' && item.raw.authorName
          ? item.raw.authorName
          : '') ||
        (typeof item.raw?.author === 'string' && item.raw.author
          ? item.raw.author
          : '');
      const authorImg =
        item.author?.image ||
        (typeof item.raw?.authorImage === 'string'
          ? item.raw.authorImage
          : '') ||
        (typeof item.raw?.avatar === 'string' ? item.raw.avatar : '');

      if (!authorName) {
        return editing ? (
          <span className="s-muted text-xs">[Author name]</span>
        ) : null;
      }

      const mode = row.authorDisplay ?? 'name';
      const authorEl = el(styledForLegacy, 'value', 's-muted text-xs');
      const avatarNode = authorImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={authorImg}
          alt={authorName}
          className="size-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {authorName.charAt(0).toUpperCase()}
        </span>
      );

      if (mode === 'avatar') {
        return wrapWithLabel(avatarNode);
      }
      if (mode === 'avatar-name') {
        return wrapWithLabel(
          <span
            className={cn('inline-flex items-center gap-2', authorEl.className)}
            style={authorEl.style}
          >
            {avatarNode}
            <span>
              {row.authorPrefix ? `${row.authorPrefix}${authorName}` : authorName}
            </span>
          </span>
        );
      }

      return wrapWithLabel(
        <span className={authorEl.className} style={authorEl.style}>
          {row.authorPrefix ? `${row.authorPrefix}${authorName}` : authorName}
        </span>
      );
    }

    case 'terms': {
      const allTerms = Array.isArray(item.terms) ? item.terms : [];
      const taxFilter =
        customKey === 'category'
          ? 'category'
          : customKey === 'tags'
            ? 'tag'
            : (row.termsTaxonomy ?? 'all');

      let terms = allTerms;
      if (taxFilter && taxFilter !== 'all') {
        const matched = allTerms.filter(t => t.taxonomy === taxFilter);
        if (matched.length > 0) {
          terms = matched;
        } else if (taxFilter === 'category' && allTerms.length > 0) {
          const firstTax = allTerms[0].taxonomy;
          terms = allTerms.filter(t => t.taxonomy === firstTax);
        } else if (taxFilter === 'tag' && allTerms.length > 0) {
          const firstTax = allTerms[0].taxonomy;
          const secondary = allTerms.filter(t => t.taxonomy !== firstTax);
          terms = secondary.length > 0 ? secondary : allTerms;
        }
      }

      if (terms.length === 0) {
        return editing ? (
          <span className="s-muted text-xs">[No terms]</span>
        ) : null;
      }

      const display = row.termsDisplay ?? 'badges';
      if (display === 'comma') {
        const termEl = el(
          styledForLegacy,
          'value',
          's-primary-text text-xs font-semibold'
        );
        return wrapWithLabel(
          <span className={termEl.className} style={termEl.style}>
            {terms.map(t => t.name).join(', ')}
          </span>
        );
      }
      if (display === 'dot') {
        const termEl = el(
          styledForLegacy,
          'value',
          's-primary-text text-xs font-semibold uppercase tracking-wider'
        );
        return wrapWithLabel(
          <span className={termEl.className} style={termEl.style}>
            {terms.map(t => t.name).join(' · ')}
          </span>
        );
      }

      const itemClass =
        display === 'pills'
          ? 's-border s-primary-text inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'
          : display === 'badges'
            ? 's-primary-text inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider'
            : 's-primary-text text-xs font-semibold uppercase tracking-wider';
      const termItemEl = el(styledForLegacy, 'value', itemClass);

      return wrapWithLabel(
        <div className="flex flex-wrap gap-1.5">
          {terms.map(t => (
            <span
              key={`${t.taxonomy}-${t.id}`}
              className={termItemEl.className}
              style={termItemEl.style}
            >
              {t.name}
            </span>
          ))}
        </div>
      );
    }

    case 'permalink':
    case 'url': {
      const isPermalink = kind === 'permalink';
      const dynamicHref = isPermalink
        ? item.url
        : typeof rawVal === 'string'
          ? rawVal.trim()
          : '';
      const urlCfg = normalizeUrlValue(row.urlConfig);
      const finalHref =
        urlCfg.url.trim() || dynamicHref || (editing ? '#' : '');

      if (!finalHref) {
        return editing ? (
          <span className="s-muted text-xs">[{label || 'URL'}]</span>
        ) : null;
      }

      if (
        editing &&
        !isPermalink &&
        dynamicHref &&
        !isValidGeneralUrl(dynamicHref)
      ) {
        return wrapWithLabel(
          <BuilderValidationBanner
            message={`Invalid URL in "${label || customKey}": ${GENERAL_URL_ERROR}`}
          />
        );
      }

      const overlayId = parseOverlayHref(finalHref);
      const isExternal = /^https?:\/\//i.test(finalHref);
      const newTab =
        urlCfg.newTab ||
        Boolean(row.urlNewTab) ||
        (!isPermalink &&
          isExternal &&
          row.urlNewTab !== false &&
          row.urlConfig === undefined);
      const nofollow = urlCfg.nofollow;
      const rel =
        [newTab ? 'noopener noreferrer' : '', nofollow ? 'nofollow' : '']
          .filter(Boolean)
          .join(' ') || undefined;

      const display = row.urlDisplay ?? 'link';
      const customText =
        row.urlLinkText?.trim() || row.readMoreLabel?.trim() || '';
      const linkText = isPermalink
        ? customText || 'Read more'
        : customText && customText !== 'Read more'
          ? customText
          : dynamicHref
            ? dynamicHref.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
            : label || 'Visit link';

      if (display === 'text') {
        const textEl = el(
          styledForLegacy,
          'value',
          'text-sm font-medium break-all'
        );
        return wrapWithLabel(
          <span className={textEl.className} style={textEl.style}>
            {dynamicHref || finalHref}
          </span>
        );
      }

      const isButton = display === 'button';
      const linkProps = linkEl(
        styledForLegacy,
        'link',
        cn(
          isButton
            ? 's-primary-bg inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:opacity-90'
            : 's-primary-text inline-flex items-center gap-1 text-sm font-semibold hover:underline',
          align === 'center' ? 'mx-auto' : align === 'right' ? 'ms-auto' : ''
        )
      );

      const showArrow = row.showArrow !== false;
      const innerContent =
        isPermalink && !isButton && !newTab ? (
          <>
            {linkText}
            {showArrow ? ' →' : ''}
          </>
        ) : (
          <>
            <span>{linkText}</span>
            {showArrow &&
              (newTab ? (
                <ExternalLink className="size-3.5" aria-hidden />
              ) : (
                <span aria-hidden>→</span>
              ))}
          </>
        );

      const popupOverlayId =
        row.popupTrigger && row.overlayId ? row.overlayId : overlayId;
      if (popupOverlayId) {
        return wrapWithLabel(
          <OverlayTrigger
            overlayId={popupOverlayId}
            loopItem={item}
            className={linkProps.className}
          >
            <span style={linkProps.style}>{innerContent}</span>
          </OverlayTrigger>
        );
      }

      const resolvedFinalHref = sanitizeLoopUrl(
        isPermalink && row.singlePageUrl?.trim()
          ? resolveLoopItemHref(item, row)
          : finalHref,
        '#'
      );
      const effectiveRel =
        rel ||
        (isExternalHttpUrl(resolvedFinalHref)
          ? 'noopener noreferrer'
          : undefined);

      return wrapWithLabel(
        <a
          href={resolvedFinalHref}
          target={newTab ? '_blank' : undefined}
          rel={effectiveRel}
          className={linkProps.className}
          style={linkProps.style}
        >
          {innerContent}
        </a>
      );
    }

    case 'video': {
      const videoUrl =
        typeof rawVal === 'string'
          ? rawVal.trim()
          : rawVal !== undefined && rawVal !== null
            ? String(rawVal).trim()
            : '';
      if (!videoUrl && !editing && !(row.popupTrigger && row.overlayId)) {
        return null;
      }
      if (editing && videoUrl && !parseVideoUrl(videoUrl)) {
        return wrapWithLabel(
          <BuilderValidationBanner
            message={`Invalid Video URL in "${label || customKey}": ${VIDEO_URL_ERROR}`}
          />
        );
      }
      return wrapWithLabel(
        <VideoContentFrame
          url={videoUrl}
          posterUrl={row.posterUrl}
          popupTrigger={row.popupTrigger}
          overlayId={row.overlayId}
          editing={editing}
          emptyMessage={`[No video URL for ${label || 'video'}]`}
          frameClassName={cn(
            's-radius aspect-video w-full rounded-lg',
            ...valueStyle.classes
          )}
          frameStyle={valueStyle.style}
        />
      );
    }

    case 'embed': {
      const embedUrl =
        typeof rawVal === 'string'
          ? rawVal.trim()
          : rawVal !== undefined && rawVal !== null
            ? String(rawVal).trim()
            : '';
      if (!embedUrl && !editing) return null;
      if (editing && embedUrl && !isValidEmbedUrl(embedUrl)) {
        return wrapWithLabel(
          <BuilderValidationBanner
            message={`Invalid Embed URL in "${label || customKey}": ${EMBED_URL_ERROR}`}
          />
        );
      }
      return wrapWithLabel(
        <EmbedContentFrame
          url={embedUrl}
          editing={editing}
          emptyMessage={`[No embed URL for ${label || 'embed'}]`}
          frameClassName={cn(
            's-radius aspect-video w-full rounded-lg',
            ...valueStyle.classes
          )}
          frameStyle={valueStyle.style}
        />
      );
    }

    case 'bookmark':
      return (
        <BookmarkToggle url={item.url} title={item.title} image={item.image} />
      );

    case 'boolean': {
      if (rawVal === undefined || rawVal === null) return null;
      const boolVal = rawVal === true || rawVal === 'true' || rawVal === 1;
      const textEl = el(
        styledForLegacy,
        'value',
        'inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium'
      );
      return wrapWithLabel(
        <span className={textEl.className} style={textEl.style}>
          {boolVal ? 'Yes' : 'No'}
        </span>
      );
    }

    case 'number':
    case 'select':
    case 'text':
    default: {
      if (rawVal === undefined || rawVal === null || rawVal === '') {
        return editing && customKey ? (
          <span className="s-muted text-xs">[{label || customKey}]</span>
        ) : null;
      }
      const strVal =
        typeof rawVal === 'object' && !Array.isArray(rawVal)
          ? Object.entries(rawVal as Record<string, unknown>)
              .filter(
                ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
              )
              .map(([k, v]) => `${humanizeKey(k)}: ${String(v)}`)
              .join(' · ') || JSON.stringify(rawVal)
          : typeof rawVal === 'object'
            ? JSON.stringify(rawVal)
            : String(rawVal);

      if (kind === 'select') {
        const selectEl = el(
          styledForLegacy,
          'value',
          's-primary-text inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold'
        );
        return wrapWithLabel(
          <span className={selectEl.className} style={selectEl.style}>
            {strVal}
          </span>
        );
      }

      const size = row.textSize && row.textSize !== 'auto' ? row.textSize : null;
      const Tag = size ? SIZE_TAG[size] : 'span';
      const baseClass = size ? SIZE_CLASS[size] : 'text-sm';
      const valEl = el(styledForLegacy, 'value', baseClass);
      const valHref = resolveLoopItemHref(item, row);

      return wrapWithLabel(
        <Tag className={valEl.className} style={valEl.style}>
          {row.popupTrigger && row.overlayId ? (
            <OverlayTrigger
              overlayId={row.overlayId}
              loopItem={item}
              className="hover:underline"
            >
              {strVal}
            </OverlayTrigger>
          ) : row.linkToItem || Boolean(row.singlePageUrl?.trim()) ? (
            <a
              href={valHref}
              rel={isExternalHttpUrl(valHref) ? 'noopener noreferrer' : undefined}
              className="hover:underline"
            >
              {strVal}
            </a>
          ) : (
            strVal
          )}
        </Tag>
      );
    }
  }
}

/**
 * Renders mapped External API fields (`apiFields: ExternalApiFieldMapping[]`)
 * directly inside a QueryLoop card, supporting nested dot-notation keys,
 * nested array repeaters, dynamic view modes, and builder validation notices.
 */
export function ExternalApiMappedFieldsView({
  item,
  apiFields,
  language = 'en',
  editing,
  elements,
}: {
  item: (typeof SAMPLE_LOOP_ITEMS)[number];
  apiFields: ExternalApiFieldMapping[];
  language?: string;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const rows = apiFields
    .filter(f => f && typeof f === 'object' && f.key)
    .map(apiFieldMappingToLoopRow);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" data-external-api-mapped-fields="">
      {rows.map((row, idx) => (
        <LoopItemFieldRowView
          // biome-ignore lint/suspicious/noArrayIndexKey: mapped field order
          key={idx}
          row={row}
          item={item}
          previewFields={[]}
          language={language}
          align="left"
          editing={editing}
          legacyElements={elements}
        />
      ))}
    </div>
  );
}

export function LoopItemField(props: LoopItemFieldProps) {
  const item = useLoopItem() ?? SAMPLE_LOOP_ITEMS[0];
  const { fields: previewFields } = useLoopPreview();
  const rows = rowsOfLoopItemField(props);
  const language = props.language ?? 'en';
  const align = props.align ?? 'left';
  const layout = props.layout ?? 'clean';
  const direction = props.direction ?? 'stack';
  const gap = props.gap ?? 'sm';

  const renderedRows = rows
    .map((row, idx) => {
      const node = (
        <LoopItemFieldRowView
          // biome-ignore lint/suspicious/noArrayIndexKey: rows can repeat the same field
          key={idx}
          row={row}
          item={item}
          previewFields={previewFields}
          language={language}
          align={align}
          editing={props.editing}
          legacyElements={props.elements}
        />
      );
      return { row, node, idx };
    })
    .filter(entry => entry.node !== null);

  if (renderedRows.length === 0) return null;

  // Single-row clean layout without section wrapper preserves lightweight DOM
  const hasSectionSettings = Boolean(
    props.section && Object.keys(props.section).length > 0
  );
  const hasContainerStyle = Boolean(props.elements?.container);

  if (
    renderedRows.length === 1 &&
    layout === 'clean' &&
    align === 'left' &&
    !hasSectionSettings &&
    !hasContainerStyle
  ) {
    return <>{renderedRows[0].node}</>;
  }

  if (layout === 'table') {
    const tableEl = el(
      { elements: props.elements },
      'container',
      's-card s-card-outline overflow-hidden rounded-lg border'
    );
    const tableNode = (
      <dl
        className={tableEl.className}
        style={tableEl.style}
        data-overlay-group=""
      >
        {rows.map((row, index) => {
          const customKey = (row.customKey ?? '').trim();
          const rowLabel =
            row.labelText?.trim() ||
            (row.field === 'custom'
              ? (previewFields.find(f => f.path === customKey)?.label ??
                humanizeKey(customKey))
              : humanizeKey(row.field ?? 'Field'));
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id
              key={index}
              className="s-border grid gap-1 border-b px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(6rem,36%)_1fr] sm:gap-4"
            >
              <dt className="s-meta text-xs font-semibold uppercase tracking-wider s-muted">
                {rowLabel}
              </dt>
              <dd className="min-w-0">
                <LoopItemFieldRowView
                  row={{ ...row, showLabel: false }}
                  item={item}
                  previewFields={previewFields}
                  language={language}
                  align="left"
                  editing={props.editing}
                  legacyElements={props.elements}
                />
              </dd>
            </div>
          );
        })}
      </dl>
    );
    return hasSectionSettings ? (
      <Section section={props.section} editing={props.editing}>
        {tableNode}
      </Section>
    ) : (
      tableNode
    );
  }

  const containerEl = el(
    { elements: props.elements },
    'container',
    cn(
      layout === 'card' && 's-surface s-border s-radius border p-4 shadow-xs',
      direction === 'row'
        ? 'flex flex-wrap items-center'
        : direction === 'grid'
          ? 'grid sm:grid-cols-2'
          : 'flex flex-col',
      GAP_CLASS[gap] ?? GAP_CLASS.sm,
      ALIGN_CLASS[align]
    )
  );

  const contentNode = (
    <div
      className={containerEl.className}
      style={containerEl.style}
      data-overlay-group=""
    >
      {renderedRows.map(r => r.node)}
    </div>
  );

  return hasSectionSettings ? (
    <Section section={props.section} editing={props.editing}>
      {contentNode}
    </Section>
  ) : (
    contentNode
  );
}
