'use client';

import type { NormalizedListingItem } from '@nextcms/builder-core';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type AnchorHTMLAttributes,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';

// ---------------------------------------------------------------------------
// Loop Item React Context (R575 / QRY-05)
// ---------------------------------------------------------------------------

const LoopItemContext = createContext<NormalizedListingItem | null>(null);

export function LoopItemProvider({
  item,
  children,
}: {
  item: NormalizedListingItem;
  children: ReactNode;
}) {
  return (
    <LoopItemContext.Provider value={item}>{children}</LoopItemContext.Provider>
  );
}

export function useLoopItem(): NormalizedListingItem | null {
  return useContext(LoopItemContext);
}

/**
 * Client anchor for `#overlay:<id>` links inside a Loop Grid card (e.g. a
 * Container link). Attaches `data-overlay-loop-item` when rendered inside
 * `LoopItemProvider` so OverlayHost receives the clicked item.
 */
export function OverlayLoopAnchor(
  props: AnchorHTMLAttributes<HTMLAnchorElement>
) {
  const item = useLoopItem();
  let loopItemAttr: string | undefined;
  if (item) {
    try {
      loopItemAttr = JSON.stringify(item);
    } catch {
      loopItemAttr = undefined;
    }
  }
  return <a {...props} data-overlay-loop-item={loopItemAttr} />;
}

// ---------------------------------------------------------------------------
// Carousel Client Wrapper (R576 / QRY-06)
// ---------------------------------------------------------------------------

export function QueryLoopCarousel({
  children,
  gapClass,
  columnsDesktop = 3,
  elements,
}: {
  children: ReactNode[];
  gapClass: string;
  columnsDesktop?: number;
  elements?: Record<string, ElementStyle>;
}) {
  const arrowEl = el(
    { elements },
    'arrow',
    's-border s-surface s-radius inline-flex size-9 items-center justify-center border transition-colors hover:opacity-80'
  );
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.75, 280) * direction;
    track.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  const basisClass =
    columnsDesktop === 1
      ? 'w-full'
      : columnsDesktop === 2
        ? 'w-[85%] sm:w-[calc(50%-12px)]'
        : columnsDesktop === 4
          ? 'w-[85%] sm:w-[calc(50%-12px)] s-desk-w-q4'
          : 'w-[85%] sm:w-[calc(50%-12px)] s-desk-w-q3';

  return (
    <div className="relative">
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByAmount(-1)}
          aria-label="Previous slide"
          {...arrowEl}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollByAmount(1)}
          aria-label="Next slide"
          {...arrowEl}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div
        ref={trackRef}
        className={cn(
          'flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-4',
          gapClass
        )}
        role="region"
        aria-label="Items carousel"
        tabIndex={0}
      >
        {children.map((child, idx) => (
          <div key={idx} className={cn('shrink-0 snap-start', basisClass)}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progressive Pagination Client Enhancement (R577 / QRY-07, R599 / QRY-29)
// ---------------------------------------------------------------------------

export interface QueryLoopPaginationProps {
  mode: 'numbered' | 'load-more' | 'infinite-scroll';
  page: number;
  totalPages: number;
  pageParamKey: string;
  loadMoreLabel?: string;
  regionId: string;
  editing?: boolean;
  /** Pre-built server hrefs for each page (1..totalPages) so crawlable links work without JS. */
  pageHrefs: Record<number, string>;
  elements?: Record<string, ElementStyle>;
}

export function QueryLoopPagination({
  mode,
  page,
  totalPages,
  pageParamKey,
  loadMoreLabel = 'Load more',
  regionId,
  editing,
  pageHrefs,
  elements,
}: QueryLoopPaginationProps) {
  const pageLinkEl = el(
    { elements },
    'pagination',
    's-border s-surface s-radius rounded border px-3 py-1.5 font-medium transition-colors hover:opacity-80'
  );
  const pageNumberEl = el(
    { elements },
    'pagination',
    's-radius min-w-9 rounded px-3 py-1.5 text-center font-medium transition-colors s-surface s-border border hover:opacity-80'
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [lastTriggeredPage, setLastTriggeredPage] = useState(page);

  useEffect(() => {
    setLastTriggeredPage(page);
  }, [page]);

  const navigateToPage = useCallback(
    (targetPage: number, moveFocusToResults = false) => {
      if (editing) return;
      const next = new URLSearchParams(searchParams.toString());
      if (targetPage <= 1) {
        next.delete(pageParamKey);
      } else {
        next.set(pageParamKey, String(targetPage));
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.push(url, { scroll: mode === 'numbered' });
        if (moveFocusToResults && typeof document !== 'undefined') {
          const region = document.getElementById(regionId);
          region?.focus({ preventScroll: mode !== 'numbered' });
        }
      });
    },
    [editing, mode, pageParamKey, pathname, regionId, router, searchParams]
  );

  // Infinite scroll observer (R577 / QRY-07)
  useEffect(() => {
    if (mode !== 'infinite-scroll' || editing || page >= totalPages) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          !isPending &&
          lastTriggeredPage === page &&
          page < totalPages
        ) {
          setLastTriggeredPage(page + 1);
          navigateToPage(page + 1, false);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    editing,
    isPending,
    lastTriggeredPage,
    mode,
    navigateToPage,
    page,
    totalPages,
  ]);

  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const nextHref =
    pageHrefs[Math.min(page + 1, totalPages)] ?? `?${pageParamKey}=${page + 1}`;
  const prevHref =
    pageHrefs[Math.max(page - 1, 1)] ??
    `?${pageParamKey}=${Math.max(page - 1, 1)}`;

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      {(mode === 'load-more' || mode === 'infinite-scroll') &&
        page < totalPages && (
          <div ref={sentinelRef} className="flex flex-col items-center gap-2">
            <a
              href={nextHref}
              onClick={e => {
                e.preventDefault();
                navigateToPage(page + 1, false);
              }}
              aria-busy={isPending}
              {...el(
                { elements },
                'loadMore',
                's-primary-bg s-radius inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90'
              )}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {loadMoreLabel}
            </a>
          </div>
        )}

      {/* Always render crawlable pagination links underneath (R577 / QRY-07) */}
      <nav
        aria-label="Pagination"
        className={cn(
          'flex flex-wrap items-center justify-center gap-2 text-sm',
          mode !== 'numbered' && 'sr-only focus-within:not-sr-only'
        )}
      >
        {page > 1 && (
          <a
            href={prevHref}
            rel="prev"
            onClick={e => {
              e.preventDefault();
              navigateToPage(page - 1, true);
            }}
            {...pageLinkEl}
          >
            Previous
          </a>
        )}
        {pages.map(n => (
          <a
            key={n}
            href={pageHrefs[n] ?? `?${pageParamKey}=${n}`}
            aria-current={n === page ? 'page' : undefined}
            onClick={e => {
              e.preventDefault();
              navigateToPage(n, true);
            }}
            {...(n === page
              ? {
                  className:
                    's-radius min-w-9 rounded px-3 py-1.5 text-center font-medium transition-colors s-primary-bg',
                }
              : pageNumberEl)}
          >
            {n}
          </a>
        ))}
        {page < totalPages && (
          <a
            href={nextHref}
            rel="next"
            onClick={e => {
              e.preventDefault();
              navigateToPage(page + 1, true);
            }}
            {...pageLinkEl}
          >
            Next
          </a>
        )}
      </nav>
    </div>
  );
}
