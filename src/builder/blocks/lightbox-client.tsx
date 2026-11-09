'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  clampLightboxPan,
  type LightboxItem,
  stepLightboxIndex,
  useLightbox,
} from '@/components/site/lightbox-context';
import { parseVideoUrl } from '@/lib/video/parse';
import { VideoPlayer } from '@/components/video/video-player';
import { saveVideoProgress } from '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions';
import { el, type WithSection } from './element';
import { Section } from './section';

const DEMO_IMAGES: LightboxItem[] = [
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop',
    alt: 'Sample 1',
    caption: 'Sample preview artwork 1',
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
    alt: 'Sample 2',
    caption: 'Sample preview artwork 2',
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=1200&auto=format&fit=crop',
    alt: 'Sample 3',
    caption: 'Sample preview artwork 3',
  },
];

/** Height kept for one line of caption below the image, in px. */
const CAPTION_ROOM = 36;
/** Height kept for the thumbnail strip including its padding, in px. */
const THUMBNAIL_ROOM = { sm: 60, md: 76 };

export type LightboxTransition = 'none' | 'fade' | 'slide' | 'zoom';
export type LightboxTransitionSpeed = 'fast' | 'normal' | 'slow';

export const DURATION_MS: Record<LightboxTransitionSpeed, number> = {
  fast: 200,
  normal: 350,
  slow: 600,
};

export function resolveLightboxTransition(
  transition: LightboxTransition | undefined,
  reducedMotion: boolean
): LightboxTransition {
  if (reducedMotion) return 'none';
  return transition ?? 'fade';
}

/** Thumbnail for an item. A video with no poster and no YouTube still gets '' (a play icon). */
export function getThumbnail(item: LightboxItem): string {
  if (item.poster) return item.poster;
  if (item.type !== 'video') return item.url;
  const parsed = item.url ? parseVideoUrl(item.url) : null;
  return parsed?.provider === 'youtube'
    ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`
    : '';
}

export type LightboxImageProps = WithSection & {
  fallbackImage?: string;
  fallbackAlt?: string;
  fallbackCaption?: string;

  showArrows?: boolean;
  loop?: boolean;
  keyboard?: boolean;
  swipe?: boolean;
  showCounter?: boolean;

  fit?: 'contain' | 'cover';
  maxHeight?: string;
  showCaption?: boolean;
  captionPosition?: 'below' | 'over';

  enableZoom?: boolean;
  maxZoom?: number | string;

  showThumbnails?: boolean;
  thumbnailSize?: 'sm' | 'md';

  transition?: LightboxTransition;
  transitionSpeed?: LightboxTransitionSpeed;
  autoplayVideo?: boolean;
  saveProgress?: boolean;
};

export function LightboxImage(p: LightboxImageProps) {
  const context = useLightbox();

  const images: LightboxItem[] = useMemo(() => {
    if (context?.images && context.images.length > 0) {
      return context.images;
    }
    if (p.fallbackImage) {
      return [
        {
          type: 'image',
          url: p.fallbackImage,
          alt: p.fallbackAlt || undefined,
          caption: p.fallbackCaption || undefined,
        },
      ];
    }
    if (p.editing) {
      return DEMO_IMAGES;
    }
    return [];
  }, [
    context?.images,
    p.fallbackImage,
    p.fallbackAlt,
    p.fallbackCaption,
    p.editing,
  ]);

  const [index, setIndex] = useState(() => context?.initialIndex ?? 0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    if (context?.initialIndex !== undefined) {
      setIndex(context.initialIndex);
    }
  }, [context?.initialIndex]);

  // Keep index within bounds if images change
  useEffect(() => {
    if (images.length === 0) return;
    if (index >= images.length) {
      setIndex(images.length - 1);
    } else if (index < 0) {
      setIndex(0);
    }
  }, [images.length, index]);

  const count = images.length;
  const hasMultiple = count > 1;
  const current = images[index] ?? images[0];

  const isVideo = current?.type === 'video';

  // Zoom & Pan state (disabled for video)
  const enableZoom = p.enableZoom !== false && !isVideo;
  const maxZoomNumber = Number(p.maxZoom) || 2;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);

  // Touch tracking for swipe and pinch
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef(1);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [index]);

  // Navigation handlers
  const canPrev = p.loop !== false || index > 0;
  const canNext = p.loop !== false || index < count - 1;

  const prev = useCallback(() => {
    setDirection(-1);
    setIndex(i => stepLightboxIndex(i, count, -1, p.loop !== false));
  }, [count, p.loop]);

  const next = useCallback(() => {
    setDirection(1);
    setIndex(i => stepLightboxIndex(i, count, 1, p.loop !== false));
  }, [count, p.loop]);

  // Keep the active thumbnail visible in a long strip
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    thumbnailsRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  // Preload adjacent images
  useEffect(() => {
    if (images.length <= 1 || typeof window === 'undefined') return;
    const nextIdx = (index + 1) % images.length;
    const prevIdx = (index - 1 + images.length) % images.length;
    const preload = (item?: LightboxItem) => {
      if (!item?.url || item.type === 'video') return;
      const img = new window.Image();
      img.src = item.url;
    };
    preload(images[nextIdx]);
    preload(images[prevIdx]);
  }, [index, images]);

  // Keyboard navigation
  useEffect(() => {
    if (p.keyboard === false || !hasMultiple || typeof window === 'undefined')
      return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [p.keyboard, hasMultiple, prev, next]);

  // Check reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  const effectiveTransition = resolveLightboxTransition(
    p.transition,
    prefersReducedMotion
  );
  const effectiveSpeed: LightboxTransitionSpeed = p.transitionSpeed ?? 'normal';
  const durationMs = DURATION_MS[effectiveSpeed];

  const transitionClasses = cn(
    effectiveTransition === 'fade' &&
      'lightbox-transition-fade transition-opacity',
    effectiveTransition === 'slide' &&
      cn(
        'lightbox-transition-slide transition-transform',
        direction >= 0 ? 'lightbox-slide-next' : 'lightbox-slide-prev'
      ),
    effectiveTransition === 'zoom' &&
      'lightbox-transition-zoom transition-transform',
    effectiveTransition === 'none' &&
      'lightbox-transition-none transition-none'
  );

  const animationStyle: React.CSSProperties =
    effectiveTransition === 'none'
      ? {}
      : effectiveTransition === 'fade'
        ? { animation: `lightboxFadeIn ${durationMs}ms ease-out` }
        : effectiveTransition === 'slide'
          ? {
              animation: `${
                direction >= 0 ? 'lightboxSlideInNext' : 'lightboxSlideInPrev'
              } ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }
          : { animation: `lightboxZoomIn ${durationMs}ms ease-out` };

  // Zoom & Pan pointer handlers
  const handlePointerDown = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (isVideo) return;
    // Reset first: a pinch back to 1x must not leave the next click ignored.
    didPanRef.current = false;
    if (!enableZoom || zoom <= 1) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (isVideo || !isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx - pan.x) > 3 || Math.abs(dy - pan.y) > 3) {
      didPanRef.current = true;
    }
    const { clientWidth, clientHeight } = e.currentTarget;
    setPan({
      x: clampLightboxPan(dx, clientWidth, zoom),
      y: clampLightboxPan(dy, clientHeight, zoom),
    });
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (isVideo) return;
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if pointer capture was already released
      }
    }
  };

  const handleImageClick = () => {
    if (isVideo || !enableZoom || didPanRef.current) return;
    if (zoom === 1) {
      setZoom(maxZoomNumber);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Touch Swipe & Pinch
  const handleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      initialPinchDistRef.current = null;
    } else if (e.touches.length === 2 && enableZoom) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (
      e.touches.length === 2 &&
      initialPinchDistRef.current &&
      enableZoom
    ) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / initialPinchDistRef.current;
      const targetZoom = Math.min(
        Math.max(1, initialZoomRef.current * scale),
        maxZoomNumber
      );
      setZoom(targetZoom);
    }
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (initialPinchDistRef.current) {
      initialPinchDistRef.current = null;
      if (zoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    if (
      p.swipe !== false &&
      hasMultiple &&
      (zoom === 1 || isVideo) &&
      e.changedTouches[0]
    ) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          prev();
        } else {
          next();
        }
      }
    }
  };

  // Resolve element styles
  const imageEl = el(p, 'image');
  const arrowEl = el(p, 'arrow');
  const counterEl = el(p, 'counter');
  const captionEl = el(p, 'caption');
  const thumbnailEl = el(p, 'thumbnail');

  if (!current) {
    return null;
  }

  const showCaption =
    p.showCaption !== false && Boolean(current.caption);
  const captionOver = p.captionPosition === 'over';
  const showArrows = p.showArrows !== false && hasMultiple;
  const showCounter = p.showCounter !== false && hasMultiple;
  const showThumbnails = p.showThumbnails !== false && hasMultiple;

  // Max height covers the whole block, so the caption and thumbnails below the
  // image still fit inside the popup instead of pushing it into a scrollbar.
  const maxHeight = p.maxHeight || '80vh';
  const reserved =
    (showCaption && !captionOver ? CAPTION_ROOM : 0) +
    (showThumbnails ? THUMBNAIL_ROOM[p.thumbnailSize === 'md' ? 'md' : 'sm'] : 0);
  const stageHeight = reserved
    ? `calc(${maxHeight} - ${reserved}px)`
    : maxHeight;

  const parsedVideo = isVideo ? parseVideoUrl(current.url) : null;

  return (
    <Section section={p.section} editing={p.editing}>
      <style>{`
        @keyframes lightboxFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lightboxSlideInNext { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes lightboxSlideInPrev { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes lightboxZoomIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      <div className="relative flex flex-col items-center justify-center w-full select-none">
        {/* Main Stage */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative flex items-center justify-center w-full overflow-hidden"
          style={{ height: stageHeight }}
        >
          {/* Keyed transition wrapper */}
          <div
            key={index}
            data-lightbox-slide={index}
            className={cn(
              'relative flex items-center justify-center w-full h-full select-none',
              transitionClasses
            )}
            style={animationStyle}
          >
            {isVideo ? (
              parsedVideo ? (
                <div className="relative aspect-video w-full max-w-5xl max-h-full overflow-hidden rounded-lg shadow-2xl">
                  <VideoPlayer
                    parsed={parsedVideo}
                    poster={current.poster}
                    title={current.caption || current.alt || 'Video'}
                    autoPlay={p.autoplayVideo !== false}
                    onProgress={
                      current.videoId && p.saveProgress !== false
                        ? progress => {
                            void saveVideoProgress({
                              videoId: current.videoId!,
                              position: progress.position,
                              duration: progress.duration,
                              completed: progress.completed,
                            });
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="relative flex aspect-video w-full max-w-3xl items-center justify-center rounded-lg bg-neutral-900 text-neutral-300">
                  <p className="text-sm">Unable to play video</p>
                </div>
              )
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.alt ?? ''}
                draggable={false}
                onClick={handleImageClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={cn(
                  'w-full h-full touch-none select-none',
                  p.fit === 'cover' ? 'object-cover' : 'object-contain',
                  enableZoom && zoom === 1 && 'cursor-zoom-in',
                  enableZoom && zoom > 1 && 'cursor-grab active:cursor-grabbing',
                  imageEl.className
                )}
                style={{
                  ...imageEl.style,
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition:
                    isPanningRef.current || prefersReducedMotion
                      ? 'none'
                      : 'transform 0.2s ease-out',
                }}
              />
            )}
          </div>

          {/* Navigation Arrows */}
          {showArrows && (
            <>
              <button
                type="button"
                data-overlay-ui=""
                aria-label="Previous image"
                onClick={prev}
                disabled={!canPrev}
                className={cn(
                  'absolute left-3 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/70 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer',
                  arrowEl.className
                )}
                style={arrowEl.style}
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                data-overlay-ui=""
                aria-label="Next image"
                onClick={next}
                disabled={!canNext}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/70 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer',
                  arrowEl.className
                )}
                style={arrowEl.style}
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {showCounter && (
            <div
              data-overlay-ui=""
              className={cn(
                'absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-black/50 text-white text-xs font-medium tabular-nums pointer-events-none',
                counterEl.className
              )}
              style={counterEl.style}
            >
              {index + 1} of {count}
            </div>
          )}

          {/* Overlay Caption */}
          {showCaption && captionOver && (
            <div
              className={cn(
                'absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white text-center text-sm',
                captionEl.className
              )}
              style={captionEl.style}
            >
              {current.caption}
            </div>
          )}
        </div>

        {/* Below Caption */}
        {showCaption && !captionOver && (
          <div
            className={cn(
              'w-full py-2 px-4 text-center text-sm text-neutral-300',
              captionEl.className
            )}
            style={captionEl.style}
          >
            {current.caption}
          </div>
        )}

        {/* Thumbnail Navigation Strip */}
        {showThumbnails && (
          <div
            ref={thumbnailsRef}
            data-overlay-ui=""
            className="flex items-center gap-2 p-2.5 overflow-x-auto max-w-full"
            // "safe" keeps the first thumbnails reachable when the strip overflows.
            style={{ justifyContent: 'safe center' }}
          >
            {images.map((item, i) => {
              const thumbUrl = getThumbnail(item);
              const isItemVideo = item.type === 'video';
              return (
                <button
                  key={`${item.url}-${i}`}
                  type="button"
                  data-overlay-ui=""
                  aria-label={`Go to ${isItemVideo ? 'video' : 'image'} ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => {
                    setDirection(i >= index ? 1 : -1);
                    setIndex(i);
                  }}
                  className={cn(
                    'relative shrink-0 overflow-hidden rounded border transition cursor-pointer',
                    p.thumbnailSize === 'md' ? 'size-14' : 'size-10',
                    i === index
                      ? 'border-blue-500 ring-2 ring-blue-500/50 opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-90',
                    thumbnailEl.className
                  )}
                  style={thumbnailEl.style}
                >
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={item.alt || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/40">
                      <Play className="size-4 text-white" />
                    </div>
                  )}
                  {isItemVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                      <Play className="size-3.5 fill-white text-white drop-shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
