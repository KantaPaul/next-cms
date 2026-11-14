'use client';

import {
  Children,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useBreakpoints } from '../breakpoints';
import {
  type BreakpointConfig,
  deviceForWidth,
  type ElementStyle,
} from '../style';
import { el } from './element';

export type ItemSliderEffect = 'slide' | 'fade' | 'zoom';
export type ItemSliderSpeed = 'fast' | 'normal' | 'slow';

export type ItemSliderProps = {
  children?: ReactNode;
  sliderPerView?: number;
  sliderPerViewTablet?: number;
  sliderPerViewMobile?: number;
  sliderGap?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
  sliderAutoplay?: boolean;
  sliderInterval?: number;
  sliderPauseOnHover?: boolean;
  sliderLoop?: boolean;
  sliderArrows?: boolean;
  sliderDots?: boolean;
  sliderEffect?: ItemSliderEffect;
  sliderSpeed?: ItemSliderSpeed;
  elements?: Record<string, ElementStyle>;
  editing?: boolean;
  ariaLabel?: string;
};

const SPV_MOBILE_CLASSES: Record<number, string> = {
  1: '[--slides-per-view:1]',
  2: '[--slides-per-view:2]',
  3: '[--slides-per-view:3]',
  4: '[--slides-per-view:4]',
  5: '[--slides-per-view:5]',
  6: '[--slides-per-view:6]',
};

const SPV_TABLET_CLASSES: Record<number, string> = {
  1: 'sm:[--slides-per-view:1]',
  2: 'sm:[--slides-per-view:2]',
  3: 'sm:[--slides-per-view:3]',
  4: 'sm:[--slides-per-view:4]',
  5: 'sm:[--slides-per-view:5]',
  6: 'sm:[--slides-per-view:6]',
};

const SPV_DESKTOP_CLASSES: Record<number, string> = {
  1: 's-desk-spv-1',
  2: 's-desk-spv-2',
  3: 's-desk-spv-3',
  4: 's-desk-spv-4',
  5: 's-desk-spv-5',
  6: 's-desk-spv-6',
};

const GAP_CONFIG: Record<string, { px: string; className: string }> = {
  sm: { px: '16px', className: 'gap-4' },
  small: { px: '16px', className: 'gap-4' },
  md: { px: '24px', className: 'gap-6' },
  medium: { px: '24px', className: 'gap-6' },
  lg: { px: '32px', className: 'gap-8' },
  large: { px: '32px', className: 'gap-8' },
};

type TrackMetrics = { clientWidth: number; scrollWidth: number; gap: number };

/** How long scroll events are ignored after an arrow, dot or autoplay move starts. */
const PROGRAMMATIC_SCROLL_MS = 700;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** Distance in px between the start of one page of slides and the next. */
function pageStep(clientWidth: number, gap: number): number {
  return clientWidth + gap;
}

export function chunkItemsIntoPages<T>(items: T[], perView: number): T[][] {
  const spv = Math.max(1, perView);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += spv) {
    pages.push(items.slice(i, i + spv));
  }
  return pages;
}

const DURATION_MS: Record<ItemSliderSpeed, number> = {
  fast: 200,
  normal: 350,
  slow: 600,
};

/** Scroll position for a page. The last page may be short, so it stops at the end of the track. */
export function pageToScroll(
  page: number,
  { clientWidth, scrollWidth, gap }: TrackMetrics
): number {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return Math.min(page * pageStep(clientWidth, gap), maxScroll);
}

/** Page shown at a scroll position. The end of the track always counts as the last page. */
export function scrollToPage(
  scrollLeft: number,
  pageCount: number,
  { clientWidth, scrollWidth, gap }: TrackMetrics
): number {
  if (clientWidth <= 0) return 0;
  if (scrollLeft >= scrollWidth - clientWidth - 1) return pageCount - 1;
  const page = Math.round(scrollLeft / pageStep(clientWidth, gap));
  return Math.min(pageCount - 1, Math.max(0, page));
}

function trackMetrics(track: HTMLElement): TrackMetrics {
  return {
    clientWidth: track.clientWidth,
    scrollWidth: track.scrollWidth,
    gap: Number.parseFloat(getComputedStyle(track).columnGap) || 0,
  };
}

function getActiveSpv(
  desktop = 3,
  tablet = 2,
  mobile = 1,
  breakpoints?: BreakpointConfig
): number {
  if (typeof window === 'undefined') return desktop;
  const dev = deviceForWidth(window.innerWidth, breakpoints);
  if (dev === 'mobile') return mobile;
  if (dev === 'mobile_extra' || dev === 'tablet' || dev === 'tablet_extra') {
    return tablet;
  }
  return desktop;
}

export function ItemSlider(p: ItemSliderProps) {
  const breakpoints = useBreakpoints();
  const slides = Children.toArray(p.children).filter(Boolean);
  const itemCount = slides.length;

  const desktopSpv = p.sliderPerView ?? 3;
  const tabletSpv = p.sliderPerViewTablet ?? 2;
  const mobileSpv = p.sliderPerViewMobile ?? 1;

  const loop = p.sliderLoop ?? false;
  const autoplay = p.sliderAutoplay ?? false;
  const autoplayInterval = p.sliderInterval ?? 5;
  const pauseOnHover = p.sliderPauseOnHover ?? true;
  const showArrows = p.sliderArrows ?? true;
  const showDots = p.sliderDots ?? true;

  const gapConfig = GAP_CONFIG[p.sliderGap ?? 'md'] ?? GAP_CONFIG.md;

  const [pageIndex, setPageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [currentSpv, setCurrentSpv] = useState(desktopSpv);
  const trackRef = useRef<HTMLDivElement>(null);
  // Scroll events during a smooth scroll would report the page it is leaving.
  const ignoreScrollUntil = useRef(0);
  const uid = useId();
  const reducedMotion = useReducedMotion();

  const effect = p.sliderEffect ?? 'slide';
  const speed = p.sliderSpeed ?? 'normal';
  const isFadeOrZoom = effect === 'fade' || effect === 'zoom';

  useEffect(() => {
    const updateSpv = () => {
      setCurrentSpv(
        getActiveSpv(desktopSpv, tabletSpv, mobileSpv, breakpoints)
      );
    };

    updateSpv();
    window.addEventListener('resize', updateSpv);

    return () => window.removeEventListener('resize', updateSpv);
  }, [desktopSpv, tabletSpv, mobileSpv, breakpoints]);

  const pages = useMemo(
    () => (isFadeOrZoom ? chunkItemsIntoPages(slides, currentSpv) : []),
    [isFadeOrZoom, slides, currentSpv]
  );

  const pageCount = isFadeOrZoom
    ? Math.max(1, pages.length)
    : Math.max(1, Math.ceil(itemCount / currentSpv));
  const allFit = itemCount <= currentSpv;
  // Fewer pages after a resize can leave the stored index past the end.
  const currentIndex = Math.min(pageIndex, pageCount - 1);

  const goToPage = useCallback(
    (page: number) => {
      if (isFadeOrZoom) {
        setPageIndex(page);
        return;
      }
      const track = trackRef.current;
      if (!track) return;
      ignoreScrollUntil.current = performance.now() + PROGRAMMATIC_SCROLL_MS;
      track.scrollTo({
        left: pageToScroll(page, trackMetrics(track)),
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
      setPageIndex(page);
    },
    [isFadeOrZoom, reducedMotion]
  );

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToPage(currentIndex - 1);
    } else if (loop && pageCount > 1) {
      goToPage(pageCount - 1);
    }
  }, [currentIndex, loop, pageCount, goToPage]);

  const goToNext = useCallback(() => {
    if (currentIndex < pageCount - 1) {
      goToPage(currentIndex + 1);
    } else if (loop && pageCount > 1) {
      goToPage(0);
    }
  }, [currentIndex, loop, pageCount, goToPage]);

  // The timer calls the latest goToNext without restarting on every page change.
  const goToNextRef = useRef(goToNext);
  useEffect(() => {
    goToNextRef.current = goToNext;
  }, [goToNext]);

  // Autoplay handler: disabled when editing, hovered (if pauseOnHover), reduced motion, or all fit
  useEffect(() => {
    if (
      p.editing ||
      !autoplay ||
      (pauseOnHover && isHovered) ||
      reducedMotion ||
      allFit ||
      pageCount <= 1
    ) {
      return;
    }

    const timer = setInterval(
      () => goToNextRef.current(),
      autoplayInterval * 1000
    );

    return () => clearInterval(timer);
  }, [
    p.editing,
    autoplay,
    pauseOnHover,
    isHovered,
    reducedMotion,
    allFit,
    pageCount,
    autoplayInterval,
  ]);

  // Track swipe and manual scroll snap
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || performance.now() < ignoreScrollUntil.current) return;
    setPageIndex(
      scrollToPage(track.scrollLeft, pageCount, trackMetrics(track))
    );
  }, [pageCount]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrev, goToNext]
  );

  const arrowEl = el(
    { elements: p.elements },
    'arrow',
    's-surface s-border s-muted absolute top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border shadow-md transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-20'
  );

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const handleTouchStartFadeZoom = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEndFadeZoom = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goToPrev();
      else goToNext();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={p.ariaLabel ?? 'Slider'}
      className="group/slider relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isFadeOrZoom ? (
        /* Fade / Zoom stacked pages */
        <div
          tabIndex={0}
          role="group"
          aria-label="Slides"
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStartFadeZoom}
          onTouchEnd={handleTouchEndFadeZoom}
          className={cn(
            'relative w-full overflow-hidden grid [grid-template-areas:"stack"] outline-none',
            `slider-effect-${effect}`,
            `slider-speed-${speed}`
          )}
        >
          {pages.map((pageSlides, pageIdx) => {
            const active = pageIdx === currentIndex;
            return (
              <div
                key={pageIdx}
                data-slider-page={pageIdx}
                aria-hidden={!active}
                className={cn(
                  '[grid-area:stack] w-full grid transition-all',
                  gapConfig.className,
                  effect === 'fade' &&
                    (active
                      ? 'opacity-100 z-10 pointer-events-auto'
                      : 'opacity-0 z-0 pointer-events-none'),
                  effect === 'zoom' &&
                    (active
                      ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                      : 'opacity-0 scale-95 z-0 pointer-events-none'),
                  reducedMotion && 'transition-none duration-0'
                )}
                style={{
                  gridTemplateColumns: `repeat(${currentSpv}, minmax(0, 1fr))`,
                  transitionDuration: reducedMotion
                    ? '0ms'
                    : `${DURATION_MS[speed]}ms`,
                }}
              >
                {pageSlides.map((slide, itemIdx) => (
                  <div key={itemIdx} className="min-w-0">
                    {slide}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* Scroll snap track */
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label="Slides"
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth outline-none motion-reduce:scroll-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            gapConfig.className,
            SPV_MOBILE_CLASSES[mobileSpv] ?? '[--slides-per-view:1]',
            SPV_TABLET_CLASSES[tabletSpv] ?? 'sm:[--slides-per-view:2]',
            SPV_DESKTOP_CLASSES[desktopSpv] ?? 's-desk-spv-3'
          )}
          style={
            {
              scrollSnapType: 'x mandatory',
              '--slider-gap': gapConfig.px,
            } as CSSProperties
          }
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="w-[calc((100%-(var(--slides-per-view)-1)*var(--slider-gap))/var(--slides-per-view))] min-w-[calc((100%-(var(--slides-per-view)-1)*var(--slider-gap))/var(--slides-per-view))] shrink-0 snap-start snap-always min-h-0"
            >
              {slide}
            </div>
          ))}
        </div>
      )}

      {/* Previous / Next buttons */}
      {showArrows && !allFit && pageCount > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            disabled={!loop && currentIndex === 0}
            aria-label="Previous slide"
            className={cn(arrowEl.className, 'start-2')}
            style={arrowEl.style}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={!loop && currentIndex === pageCount - 1}
            aria-label="Next slide"
            className={cn(arrowEl.className, 'end-2')}
            style={arrowEl.style}
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Indicator dots */}
      {showDots && !allFit && pageCount > 1 && (
        <div
          className="mt-6 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Slide indicators"
        >
          {Array.from({ length: pageCount }).map((_, i) => {
            const active = i === currentIndex;
            const dotEl = el(
              { elements: p.elements },
              'dot',
              cn(
                'h-2.5 rounded-full transition-all duration-200',
                active
                  ? 's-primary-bg w-6'
                  : 's-border bg-[color:var(--site-border)] opacity-60 hover:opacity-100 w-2.5'
              )
            );
            return (
              <button
                key={i}
                type="button"
                role="tab"
                id={`slider-dot-${uid}-${i}`}
                aria-selected={active}
                aria-label={`Slide ${i + 1}`}
                onClick={() => goToPage(i)}
                className={dotEl.className}
                style={dotEl.style}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
