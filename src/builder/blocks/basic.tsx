import type { ReactNode } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { UrlValue } from '../style';
import { el, type WithSection } from './element';
import { ButtonLink, Section } from './section';
import { BlockIcon } from '../icons';

/* =========================================================================
   1. Icon Block
   ========================================================================= */

export type IconProps = WithSection & {
  icon?: string;
  link?: UrlValue;
  linkAction?: 'url' | 'overlay';
  overlayId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alignment?: 'left' | 'center' | 'right';
  view?: 'default' | 'stacked' | 'framed';
  shape?: 'circle' | 'square';
};

const ICON_SIZES = {
  sm: 'size-5',
  md: 'size-8',
  lg: 'size-12',
  xl: 'size-16',
};

const WRAPPER_SIZES = {
  sm: 'p-2',
  md: 'p-3.5',
  lg: 'p-5',
  xl: 'p-6',
};

export function Icon(p: IconProps) {
  const iconPart = el(p, 'icon');
  const size = p.size ?? 'md';
  const view = p.view ?? 'default';
  const shape = p.shape ?? 'circle';
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const isOverlayAction = p.linkAction === 'overlay' && Boolean(p.overlayId);
  const targetLink = isOverlayAction ? `#overlay:${p.overlayId}` : p.link;
  const overlayAttr = isOverlayAction ? p.overlayId : undefined;

  let iconNode = (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-transform hover:scale-105',
        view === 'stacked' &&
          cn('s-primary-bg text-white shadow-sm', shapeClass, WRAPPER_SIZES[size]),
        view === 'framed' &&
          cn(
            'border-2 border-primary s-primary-text bg-transparent',
            shapeClass,
            WRAPPER_SIZES[size]
          ),
        view === 'default' && 's-primary-text'
      )}
    >
      <span className={cn(ICON_SIZES[size], iconPart.className)} style={iconPart.style}>
        <BlockIcon name={p.icon ?? 'Sparkles'} className="w-full h-full" />
      </span>
    </span>
  );

  if (targetLink) {
    iconNode = (
      <a
        href={typeof targetLink === 'string' ? targetLink : targetLink.url}
        data-overlay-open={overlayAttr}
        className="inline-flex"
      >
        {iconNode}
      </a>
    );
  }

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        className={cn(
          'flex w-full',
          p.alignment === 'center'
            ? 'justify-center'
            : p.alignment === 'right'
              ? 'justify-end'
              : 'justify-start'
        )}
      >
        {iconNode}
      </div>
    </Section>
  );
}

/* =========================================================================
   2. Icon Box Block
   ========================================================================= */

export type IconBoxProps = WithSection & {
  icon?: string;
  title?: string;
  description?: string;
  link?: UrlValue;
  linkAction?: 'url' | 'overlay';
  overlayId?: string;
  position?: 'top' | 'left' | 'right';
  alignment?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  view?: 'default' | 'stacked' | 'framed';
  shape?: 'circle' | 'square';
};

export function IconBox(p: IconBoxProps) {
  const titleEl = el(p, 'title', 'text-xl font-bold tracking-tight text-foreground');
  const descEl = el(p, 'description', 'mt-2 text-sm leading-relaxed s-muted');
  const iconPart = el(p, 'icon');
  const boxEl = el(p, 'box');

  const size = p.size ?? 'md';
  const view = p.view ?? 'default';
  const shape = p.shape ?? 'circle';
  const position = p.position ?? 'top';
  const align = p.alignment ?? 'left';
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const isOverlayAction = p.linkAction === 'overlay' && Boolean(p.overlayId);
  const targetLink = isOverlayAction ? `#overlay:${p.overlayId}` : p.link;
  const overlayAttr = isOverlayAction ? p.overlayId : undefined;

  const iconElement = (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0',
        view === 'stacked' &&
          cn('s-primary-bg text-white shadow-sm', shapeClass, WRAPPER_SIZES[size]),
        view === 'framed' &&
          cn(
            'border-2 border-primary s-primary-text bg-transparent',
            shapeClass,
            WRAPPER_SIZES[size]
          ),
        view === 'default' && 's-primary-text'
      )}
    >
      <span className={cn(ICON_SIZES[size], iconPart.className)} style={iconPart.style}>
        <BlockIcon name={p.icon ?? 'Sparkles'} className="w-full h-full" />
      </span>
    </span>
  );

  const content = (
    <div
      className={cn(
        'flex flex-col',
        position === 'top' &&
          align === 'center' &&
          'items-center text-center',
        position === 'top' &&
          align === 'right' &&
          'items-end text-right'
      )}
    >
      {p.title && (
        <h3 className={titleEl.className} style={titleEl.style}>
          {p.title}
        </h3>
      )}
      {p.description && (
        <p className={descEl.className} style={descEl.style}>
          {p.description}
        </p>
      )}
    </div>
  );

  const inner = (
    <div
      className={cn(
        'flex w-full gap-4',
        position === 'top' && 'flex-col',
        position === 'top' &&
          (align === 'center'
            ? 'items-center text-center'
            : align === 'right'
              ? 'items-end text-right'
              : 'items-start text-left'),
        position === 'left' && 'flex-row items-start text-left',
        position === 'right' && 'flex-row-reverse items-start text-right',
        boxEl.className
      )}
      style={boxEl.style}
    >
      {iconElement}
      {content}
    </div>
  );

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      {targetLink ? (
        <a
          href={typeof targetLink === 'string' ? targetLink : targetLink.url}
          data-overlay-open={overlayAttr}
          className="block w-full transition-opacity hover:opacity-90"
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </Section>
  );
}

/* =========================================================================
   3. Image Box Block
   ========================================================================= */

export type ImageBoxProps = WithSection & {
  image?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  link?: UrlValue;
  linkAction?: 'url' | 'overlay';
  overlayId?: string;
  position?: 'top' | 'left' | 'right';
  alignment?: 'left' | 'center' | 'right';
  imageSize?: 'sm' | 'md' | 'lg' | 'full';
};

const IMG_SIZES = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
  full: 'w-full h-auto max-h-96',
};

export function ImageBox(p: ImageBoxProps) {
  const titleEl = el(p, 'title', 'text-xl font-bold tracking-tight text-foreground');
  const descEl = el(p, 'description', 'mt-2 text-sm leading-relaxed s-muted');
  const imgEl = el(p, 'image');
  const boxEl = el(p, 'box');

  const position = p.position ?? 'top';
  const align = p.alignment ?? 'left';
  const size = p.imageSize ?? 'md';

  const isOverlayAction = p.linkAction === 'overlay' && Boolean(p.overlayId);
  const targetLink = isOverlayAction ? `#overlay:${p.overlayId}` : p.link;
  const overlayAttr = isOverlayAction ? p.overlayId : undefined;

  const imageElement = p.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.image}
      alt={p.imageAlt || p.title || ''}
      className={cn(
        'rounded-lg object-cover shrink-0',
        IMG_SIZES[size],
        imgEl.className
      )}
      style={imgEl.style}
    />
  ) : (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-steel-100 text-steel-400 shrink-0 dark:bg-dark-200',
        IMG_SIZES[size]
      )}
    >
      <BlockIcon name="Image" className="size-8" />
    </div>
  );

  const content = (
    <div
      className={cn(
        'flex flex-col',
        position === 'top' && align === 'center' && 'items-center text-center',
        position === 'top' && align === 'right' && 'items-end text-right'
      )}
    >
      {p.title && (
        <h3 className={titleEl.className} style={titleEl.style}>
          {p.title}
        </h3>
      )}
      {p.description && (
        <p className={descEl.className} style={descEl.style}>
          {p.description}
        </p>
      )}
    </div>
  );

  const inner = (
    <div
      className={cn(
        'flex w-full gap-4',
        position === 'top' && 'flex-col',
        position === 'top' &&
          (align === 'center'
            ? 'items-center text-center'
            : align === 'right'
              ? 'items-end text-right'
              : 'items-start text-left'),
        position === 'left' && 'flex-row items-start text-left',
        position === 'right' && 'flex-row-reverse items-start text-right',
        boxEl.className
      )}
      style={boxEl.style}
    >
      {imageElement}
      {content}
    </div>
  );

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      {targetLink ? (
        <a
          href={typeof targetLink === 'string' ? targetLink : targetLink.url}
          data-overlay-open={overlayAttr}
          className="block w-full transition-opacity hover:opacity-90"
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </Section>
  );
}

/* =========================================================================
   4. Progress Bar Block
   ========================================================================= */

export type ProgressBarProps = WithSection & {
  title?: string;
  percent?: number;
  innerText?: string;
  showPercent?: boolean;
  height?: number;
};

export function ProgressBar(p: ProgressBarProps) {
  const titleEl = el(p, 'title', 'text-sm font-semibold text-foreground');
  const barEl = el(p, 'bar');
  const trackEl = el(p, 'track');

  const rawPercent = typeof p.percent === 'number' ? p.percent : 70;
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
  const height = p.height ?? 16;
  const showPercent = p.showPercent ?? true;

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          {p.title && (
            <span className={titleEl.className} style={titleEl.style}>
              {p.title}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-mono font-medium text-steel-500 dark:text-steel-400">
              {percent}%
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={p.title || `Progress ${percent}%`}
          className={cn(
            'w-full overflow-hidden rounded-full bg-steel-100 dark:bg-dark-200',
            trackEl.className
          )}
          style={{ height: `${height}px`, ...trackEl.style }}
        >
          <div
            className={cn(
              'h-full s-primary-bg transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-white',
              barEl.className
            )}
            style={{ width: `${percent}%`, ...barEl.style }}
          >
            {p.innerText && percent >= 15 ? (
              <span className="truncate px-2">{p.innerText}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* =========================================================================
   5. Star Rating Block
   ========================================================================= */

export type StarRatingProps = WithSection & {
  rating?: number;
  scale?: 5 | 10;
  title?: string;
  showScore?: boolean;
  alignment?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
};

const STAR_SIZES = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
};

export function StarRating(p: StarRatingProps) {
  const titleEl = el(p, 'title', 'text-sm font-semibold text-foreground');
  const scoreEl = el(p, 'score', 'text-sm font-medium text-steel-500 dark:text-steel-400');
  const starsEl = el(p, 'stars');

  const scale = p.scale ?? 5;
  const rawRating = typeof p.rating === 'number' ? p.rating : 4.5;
  const rating = Math.max(0, Math.min(scale, rawRating));
  const size = p.size ?? 'md';
  const align = p.alignment ?? 'left';

  // For 5 scale: 5 stars; for 10 scale: 10 stars
  const count = scale;
  const stars = [];

  for (let i = 1; i <= count; i++) {
    if (rating >= i) {
      // Full star
      stars.push(
        <Star
          key={i}
          className={cn(STAR_SIZES[size], 'fill-amber-400 text-amber-400')}
          aria-hidden="true"
        />
      );
    } else if (rating >= i - 0.5) {
      // Half star
      stars.push(
        <StarHalf
          key={i}
          className={cn(STAR_SIZES[size], 'fill-amber-400 text-amber-400')}
          aria-hidden="true"
        />
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          className={cn(STAR_SIZES[size], 'text-steel-300 dark:text-dark-300')}
          aria-hidden="true"
        />
      );
    }
  }

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <div
        className={cn(
          'flex flex-col gap-1.5',
          align === 'center'
            ? 'items-center text-center'
            : align === 'right'
              ? 'items-end text-right'
              : 'items-start text-left'
        )}
        aria-label={`Rating: ${rating} out of ${scale} stars`}
      >
        {p.title && (
          <span className={titleEl.className} style={titleEl.style}>
            {p.title}
          </span>
        )}
        <div
          className={cn('flex items-center gap-1', starsEl.className)}
          style={starsEl.style}
        >
          {stars}
          {p.showScore && (
            <span className={cn('ml-2', scoreEl.className)} style={scoreEl.style}>
              {rating}/{scale}
            </span>
          )}
        </div>
      </div>
    </Section>
  );
}
