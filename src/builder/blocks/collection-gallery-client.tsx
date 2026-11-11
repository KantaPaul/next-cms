'use client';

import {
  ChevronLeft,
  ChevronRight,
  Images,
  X,
  ZoomIn,
} from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { OverlayTrigger } from './overlay-trigger';

export type GalleryStyle =
  | 'facebook'
  | 'fb-top'
  | 'fb-left'
  | 'fb-2x2'
  | 'fb-mosaic'
  | 'grid-3'
  | 'masonry'
  | 'carousel'
  | 'stacked';

export type GalleryAspect =
  | 'auto'
  | 'square'
  | 'landscape'
  | 'wide'
  | 'portrait'
  | 'tall';

export const GALLERY_STYLE_OPTIONS: { label: string; value: GalleryStyle }[] = [
  { label: 'Facebook Smart (Auto Collage)', value: 'facebook' },
  { label: 'Facebook Top Hero (1 + Strip)', value: 'fb-top' },
  { label: 'Facebook Left Hero (1 + Stack)', value: 'fb-left' },
  { label: 'Facebook Mosaic (2 + 3)', value: 'fb-mosaic' },
  { label: 'Facebook 2×2 Collage', value: 'fb-2x2' },
  { label: '3-Column Grid', value: 'grid-3' },
  { label: 'Masonry Feed', value: 'masonry' },
  { label: 'Story Carousel + Thumbnails', value: 'carousel' },
  { label: 'Stacked Stream', value: 'stacked' },
];

export const GALLERY_ASPECT_OPTIONS: { label: string; value: GalleryAspect }[] =
  [
    { label: 'Auto (Smart)', value: 'auto' },
    { label: 'Square (1:1)', value: 'square' },
    { label: 'Landscape (4:3)', value: 'landscape' },
    { label: 'Wide (16:9)', value: 'wide' },
    { label: 'Portrait (3:4)', value: 'portrait' },
    { label: 'Tall (4:5)', value: 'tall' },
  ];

const ASPECT_CLASS: Record<GalleryAspect, string> = {
  auto: '',
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-video',
  portrait: 'aspect-[3/4]',
  tall: 'aspect-[4/5]',
};

interface TileProps {
  src: string;
  alt: string;
  index: number;
  extraCount?: number;
  className?: string;
  aspectClass?: string;
  featuredBadge?: boolean;
  overlayId?: string;
  onOpen: (index: number) => void;
}

function GalleryTile({
  src,
  alt,
  index,
  extraCount = 0,
  className,
  aspectClass,
  featuredBadge = false,
  overlayId,
  onOpen,
}: TileProps) {
  const ariaLabel =
    extraCount > 0
      ? `Open gallery (${extraCount + 1} more photos)`
      : `View ${alt} photo ${index + 1}`;
  const tileClass = cn(
    'group relative block w-full overflow-hidden bg-black/5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-primary,#4f46e5)]',
    aspectClass,
    className
  );
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${alt} ${index + 1}`}
        loading={index === 0 ? 'eager' : 'lazy'}
        className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      {featuredBadge && index === 0 && (
        <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          Featured
        </span>
      )}
      {extraCount > 0 ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white backdrop-blur-[1px] transition group-hover:bg-black/65">
          +{extraCount}
        </span>
      ) : (
        <span className="pointer-events-none absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
          <ZoomIn className="size-3.5" />
        </span>
      )}
    </>
  );

  if (overlayId) {
    return (
      <OverlayTrigger
        overlayId={overlayId}
        lightbox={{ image: src, alt: `${alt} ${index + 1}` }}
        aria-label={ariaLabel}
        className={tileClass}
      >
        {inner}
      </OverlayTrigger>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={ariaLabel}
      className={tileClass}
    >
      {inner}
    </button>
  );
}

function HiddenOverlayTriggers({
  images,
  alt,
  overlayId,
  startIndex,
}: {
  images: string[];
  alt: string;
  overlayId?: string;
  startIndex: number;
}) {
  if (!overlayId || !images.length) return null;
  return (
    <>
      {images.map((src, i) => (
        <OverlayTrigger
          key={`hidden-lb-${src}-${startIndex + i}`}
          overlayId={overlayId}
          lightbox={{ image: src, alt: `${alt} ${startIndex + i + 1}` }}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        >
          <span />
        </OverlayTrigger>
      ))}
    </>
  );
}

/**
 * Interactive Facebook-style multi-angle gallery for single entry views.
 * Expects `images[0]` to already be the featured image when present.
 */
export function CollectionGallery({
  images,
  alt,
  galleryStyle = 'facebook',
  galleryAspect = 'auto',
  enableLightbox = true,
  showFeaturedBadge = true,
  overlayId,
  className,
  style,
}: {
  images: string[];
  alt: string;
  galleryStyle?: GalleryStyle;
  galleryAspect?: GalleryAspect;
  enableLightbox?: boolean;
  showFeaturedBadge?: boolean;
  overlayId?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const openLightbox = (idx: number) => {
    if (!enableLightbox) return;
    setLightboxIndex(idx);
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight') {
        setLightboxIndex(prev =>
          prev === null ? null : (prev + 1) % images.length
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex(prev =>
          prev === null ? null : (prev - 1 + images.length) % images.length
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length]);

  if (!images.length) return null;

  const count = images.length;
  const chosenAspect = ASPECT_CLASS[galleryAspect];
  const resolvedStyle: GalleryStyle =
    galleryStyle === 'facebook'
      ? count === 1
        ? 'stacked'
        : count === 2
          ? 'fb-2x2'
          : count === 3
            ? 'fb-left'
            : count === 4
              ? 'fb-top'
              : 'fb-mosaic'
      : galleryStyle;

  const tileAspect = chosenAspect || 'aspect-[4/3]';

  let gridNode: React.ReactNode;

  if (count === 1 || resolvedStyle === 'stacked') {
    gridNode = (
      <div className="space-y-3">
        {images.map((src, idx) => (
          <GalleryTile
            key={`${src}-${idx}`}
            src={src}
            alt={alt}
            index={idx}
            featuredBadge={showFeaturedBadge && count > 1}
            overlayId={overlayId}
            className="rounded-lg"
            aspectClass={chosenAspect || 'max-h-[32rem] aspect-[16/10]'}
            onOpen={openLightbox}
          />
        ))}
      </div>
    );
  } else if (resolvedStyle === 'carousel') {
    const active = Math.min(carouselIndex, count - 1);
    gridNode = (
      <div className="space-y-2.5">
        <div className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5">
          <HiddenOverlayTriggers
            images={images.slice(0, active)}
            alt={alt}
            overlayId={overlayId}
            startIndex={0}
          />
          <GalleryTile
            src={images[active]}
            alt={alt}
            index={active}
            featuredBadge={showFeaturedBadge && active === 0}
            overlayId={overlayId}
            aspectClass={chosenAspect || 'aspect-[16/10]'}
            onOpen={openLightbox}
          />
          <HiddenOverlayTriggers
            images={images.slice(active + 1)}
            alt={alt}
            overlayId={overlayId}
            startIndex={active + 1}
          />
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => setCarouselIndex((active - 1 + count) % count)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => setCarouselIndex((active + 1) % count)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Images className="size-3.5" />
            {active + 1} / {count}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => setCarouselIndex(idx)}
              aria-label={`Select photo ${idx + 1}`}
              className={cn(
                'relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
                idx === active
                  ? 'border-[var(--site-primary,#4f46e5)] ring-2 ring-[var(--site-primary,#4f46e5)]/25'
                  : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    );
  } else if (resolvedStyle === 'masonry') {
    gridNode = (
      <div className="columns-2 gap-2 space-y-2 sm:columns-3">
        {images.map((src, idx) => (
          <div key={`${src}-${idx}`} className="break-inside-avoid">
            <GalleryTile
              src={src}
              alt={alt}
              index={idx}
              featuredBadge={showFeaturedBadge && idx === 0}
              overlayId={overlayId}
              className="rounded-lg"
              aspectClass={chosenAspect || undefined}
              onOpen={openLightbox}
            />
          </div>
        ))}
      </div>
    );
  } else if (resolvedStyle === 'grid-3') {
    gridNode = (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((src, idx) => (
          <GalleryTile
            key={`${src}-${idx}`}
            src={src}
            alt={alt}
            index={idx}
            featuredBadge={showFeaturedBadge && idx === 0}
            overlayId={overlayId}
            className="rounded-lg"
            aspectClass={chosenAspect || 'aspect-square'}
            onOpen={openLightbox}
          />
        ))}
      </div>
    );
  } else if (resolvedStyle === 'fb-top') {
    const sub = images.slice(1, 4);
    const extra = Math.max(0, count - 4);
    gridNode = (
      <div className="grid gap-1.5 overflow-hidden rounded-xl">
        <GalleryTile
          src={images[0]}
          alt={alt}
          index={0}
          featuredBadge={showFeaturedBadge}
          overlayId={overlayId}
          aspectClass={chosenAspect || 'aspect-[16/9]'}
          onOpen={openLightbox}
        />
        <div
          className={cn(
            'grid gap-1.5',
            sub.length === 1
              ? 'grid-cols-1'
              : sub.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3'
          )}
        >
          {sub.map((src, i) => (
            <GalleryTile
              key={`${src}-${i + 1}`}
              src={src}
              alt={alt}
              index={i + 1}
              extraCount={i === sub.length - 1 ? extra : 0}
              overlayId={overlayId}
              aspectClass={tileAspect}
              onOpen={openLightbox}
            />
          ))}
        </div>
        <HiddenOverlayTriggers
          images={images.slice(4)}
          alt={alt}
          overlayId={overlayId}
          startIndex={4}
        />
      </div>
    );
  } else if (resolvedStyle === 'fb-left') {
    const right = images.slice(1, 4);
    const extra = Math.max(0, count - 4);
    const rowsClass =
      right.length === 1
        ? 'grid-rows-1'
        : right.length === 2
          ? 'grid-rows-2'
          : 'grid-rows-3';
    gridNode = (
      <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-xl sm:min-h-[22rem]">
        <div className="col-span-2 flex">
          <GalleryTile
            src={images[0]}
            alt={alt}
            index={0}
            featuredBadge={showFeaturedBadge}
            overlayId={overlayId}
            className="h-full"
            aspectClass={chosenAspect || 'aspect-[4/3] sm:aspect-auto'}
            onOpen={openLightbox}
          />
        </div>
        <div className={cn('grid gap-1.5', rowsClass)}>
          {right.map((src, i) => (
            <GalleryTile
              key={`${src}-${i + 1}`}
              src={src}
              alt={alt}
              index={i + 1}
              extraCount={i === right.length - 1 ? extra : 0}
              overlayId={overlayId}
              className="h-full"
              aspectClass={chosenAspect || 'aspect-square sm:aspect-auto'}
              onOpen={openLightbox}
            />
          ))}
        </div>
        <HiddenOverlayTriggers
          images={images.slice(4)}
          alt={alt}
          overlayId={overlayId}
          startIndex={4}
        />
      </div>
    );
  } else if (resolvedStyle === 'fb-2x2') {
    const visible = images.slice(0, 4);
    const extra = Math.max(0, count - 4);
    gridNode = (
      <div
        className={cn(
          'grid gap-1.5 overflow-hidden rounded-xl',
          visible.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
        )}
      >
        {visible.map((src, idx) => (
          <GalleryTile
            key={`${src}-${idx}`}
            src={src}
            alt={alt}
            index={idx}
            featuredBadge={showFeaturedBadge && idx === 0}
            extraCount={idx === visible.length - 1 ? extra : 0}
            overlayId={overlayId}
            aspectClass={chosenAspect || 'aspect-square'}
            onOpen={openLightbox}
          />
        ))}
        <HiddenOverlayTriggers
          images={images.slice(4)}
          alt={alt}
          overlayId={overlayId}
          startIndex={4}
        />
      </div>
    );
  } else {
    // 'fb-mosaic': Facebook 2 top + 3 bottom collage (featured always top-left)
    const top = images.slice(0, 2);
    const bottom = images.slice(2, 5);
    const extra = Math.max(0, count - 5);
    gridNode = (
      <div className="grid gap-1.5 overflow-hidden rounded-xl">
        <div
          className={cn(
            'grid gap-1.5',
            top.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {top.map((src, idx) => (
            <GalleryTile
              key={`${src}-${idx}`}
              src={src}
              alt={alt}
              index={idx}
              featuredBadge={showFeaturedBadge && idx === 0}
              overlayId={overlayId}
              aspectClass={chosenAspect || 'aspect-[4/3]'}
              onOpen={openLightbox}
            />
          ))}
        </div>
        {bottom.length > 0 && (
          <div
            className={cn(
              'grid gap-1.5',
              bottom.length === 1
                ? 'grid-cols-1'
                : bottom.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            )}
          >
            {bottom.map((src, i) => (
              <GalleryTile
                key={`${src}-${i + 2}`}
                src={src}
                alt={alt}
                index={i + 2}
                extraCount={i === bottom.length - 1 ? extra : 0}
                overlayId={overlayId}
                aspectClass={chosenAspect || 'aspect-square'}
                onOpen={openLightbox}
              />
            ))}
          </div>
        )}
        <HiddenOverlayTriggers
          images={images.slice(5)}
          alt={alt}
          overlayId={overlayId}
          startIndex={5}
        />
      </div>
    );
  }

  const lightboxDialog =
    !overlayId && enableLightbox && lightboxIndex !== null ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        onClick={() => setLightboxIndex(null)}
      >
        <div
          className="relative flex w-full max-w-5xl flex-1 items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close lightbox"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-0 top-0 z-10 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          {count > 1 && (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() =>
                setLightboxIndex((lightboxIndex - 1 + count) % count)
              }
              className="absolute left-2 z-10 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIndex]}
            alt={`${alt} ${lightboxIndex + 1}`}
            className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          {count > 1 && (
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setLightboxIndex((lightboxIndex + 1) % count)}
              className="absolute right-2 z-10 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
        {count > 1 && (
          <div
            className="mt-3 flex max-w-4xl items-center gap-2 overflow-x-auto pb-1"
            onClick={e => e.stopPropagation()}
          >
            <span className="mr-2 text-xs font-medium text-white/80">
              {lightboxIndex + 1} / {count}
              {lightboxIndex === 0 ? ' (Featured)' : ''}
            </span>
            {images.map((src, idx) => (
              <button
                key={`lb-${src}-${idx}`}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={`View photo ${idx + 1}`}
                className={cn(
                  'size-12 shrink-0 overflow-hidden rounded border-2 transition',
                  idx === lightboxIndex
                    ? 'border-white opacity-100'
                    : 'border-transparent opacity-55 hover:opacity-90'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      className={cn('w-full', className)}
      style={style}
      data-gallery-style={galleryStyle}
      data-gallery-aspect={galleryAspect}
      data-overlay-group={overlayId ? '' : undefined}
    >
      {gridNode}
      {lightboxDialog &&
        (typeof document !== 'undefined'
          ? createPortal(lightboxDialog, document.body)
          : lightboxDialog)}
    </div>
  );
}
