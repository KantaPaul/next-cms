'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { renderSlot, type SlotValue } from './content';
import { Section, type SectionSettings } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type InteractivePanelItem = {
  label?: string;
  content?: SlotValue;
};

/** Rendered panel. Puck slot functions are resolved before they reach these client components. */
export type InteractivePanel = {
  label?: string;
  node?: ReactNode;
};

function panelsFrom(p: { items?: InteractivePanelItem[]; panels?: InteractivePanel[] }): InteractivePanel[] {
  if (p.panels) return p.panels;
  return (p.items ?? []).map(item => ({ label: item.label, node: renderSlot(item.content) }));
}

/* =========================================================================
   1. SLIDER
   ========================================================================= */

export type SliderProps = WithSection & {
  items?: InteractivePanelItem[];
  panels?: InteractivePanel[];
  loop?: boolean;
  autoplay?: boolean;
  autoplayInterval?: 3 | 5 | 7 | 10;
  showArrows?: boolean;
  showDots?: boolean;
};

export function Slider(p: SliderProps) {
  const items = panelsFrom(p);
  const itemCount = items.length;
  const loop = p.loop ?? false;
  const autoplay = p.autoplay ?? false;
  const autoplayInterval = p.autoplayInterval ?? 5;
  const showArrows = p.showArrows ?? true;
  const showDots = p.showDots ?? true;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Scroll smoothly to a target slide index
  const scrollToIndex = useCallback((index: number) => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const slideWidth = track.clientWidth;
    track.scrollTo({
      left: index * slideWidth,
      behavior: 'smooth',
    });
    setCurrentIndex(index);
  }, []);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    } else if (loop && itemCount > 1) {
      scrollToIndex(itemCount - 1);
    }
  }, [currentIndex, loop, itemCount, scrollToIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < itemCount - 1) {
      scrollToIndex(currentIndex + 1);
    } else if (loop && itemCount > 1) {
      scrollToIndex(0);
    }
  }, [currentIndex, loop, itemCount, scrollToIndex]);

  // Autoplay handler (disabled when editing, hovered, or only 1 item)
  useEffect(() => {
    if (p.editing || !autoplay || isHovered || itemCount <= 1) return;
    const intervalMs = autoplayInterval * 1000;
    const timer = setInterval(() => {
      setCurrentIndex(curr => {
        const next = curr + 1;
        if (next >= itemCount) {
          if (loop) {
            scrollToIndex(0);
            return 0;
          }
          return curr;
        }
        scrollToIndex(next);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [p.editing, autoplay, autoplayInterval, isHovered, itemCount, loop, scrollToIndex]);

  // Track user swipe / manual scroll snap
  const handleScroll = useCallback(() => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const slideWidth = track.clientWidth;
    if (slideWidth > 0) {
      const newIndex = Math.round(track.scrollLeft / slideWidth);
      if (newIndex >= 0 && newIndex < itemCount && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, itemCount]);

  // In editing mode, stack every panel with its label above its drop zone
  if (p.editing) {
    return (
      <Section section={p.section} editing hasItems>
        <div className="flex flex-col gap-5">
          {items.map((item, i) => (
            <div key={i} className="s-surface s-border s-radius border p-4 shadow-xs">
              <div className="s-muted mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span>Slide {i + 1}: {item.label || `Slide ${i + 1}`}</span>
                <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-medium dark:bg-white/10">
                  Slide drop zone
                </span>
              </div>
              <div className="min-w-0 [&_section]:py-0 [&_section>div]:px-0">
                {item.node}
              </div>
            </div>
          ))}
          {itemCount === 0 && (
            <div className="s-surface s-border s-radius s-muted border border-dashed p-6 text-center text-sm">
              No slides added. Add slides in the sidebar inspector.
            </div>
          )}
        </div>
      </Section>
    );
  }

  // Public / preview interactive view
  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <div
        className="group/slider relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Scroll snap track */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="w-full min-w-full shrink-0 snap-center snap-always min-h-0 [&_section]:py-0 [&_section>div]:px-0"
            >
              {item.node}
            </div>
          ))}
        </div>

        {/* Previous / Next buttons */}
        {showArrows && itemCount > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              disabled={!loop && currentIndex === 0}
              aria-label="Previous slide"
              className="s-surface s-border s-muted absolute left-2 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border shadow-md transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={!loop && currentIndex === itemCount - 1}
              aria-label="Next slide"
              className="s-surface s-border s-muted absolute right-2 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full border shadow-md transition hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Indicator dots */}
        {showDots && itemCount > 1 && (
          <div
            className="mt-6 flex items-center justify-center gap-2"
            role="tablist"
            aria-label="Slide indicators"
          >
            {items.map((item, i) => {
              const active = i === currentIndex;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  id={`slider-dot-${uid}-${i}`}
                  aria-selected={active}
                  aria-label={item.label || `Slide ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    'h-2.5 rounded-full transition-all duration-200',
                    active
                      ? 's-primary-bg w-6'
                      : 's-border bg-[color:var(--site-border)] opacity-60 hover:opacity-100 w-2.5'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}

/* =========================================================================
   2. TABS
   ========================================================================= */

export type TabsProps = WithSection & {
  items?: InteractivePanelItem[];
  panels?: InteractivePanel[];
  variant?: 'underline' | 'pills';
  alignment?: 'start' | 'center';
};

export function Tabs(p: TabsProps) {
  const items = panelsFrom(p);
  const itemCount = items.length;
  const variant = p.variant ?? 'underline';
  const alignment = p.alignment ?? 'start';
  const [activeTab, setActiveTab] = useState(0);
  const uid = useId();
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      targetIndex = (index + 1) % itemCount;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      targetIndex = (index - 1 + itemCount) % itemCount;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = itemCount - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      setActiveTab(targetIndex);
      tabsRef.current[targetIndex]?.focus();
    }
  };

  // In editing mode, stack every panel with its label above its drop zone
  if (p.editing) {
    return (
      <Section section={p.section} editing hasItems>
        <div className="flex flex-col gap-5">
          {items.map((item, i) => (
            <div key={i} className="s-surface s-border s-radius border p-4 shadow-xs">
              <div className="s-muted mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span>Tab {i + 1}: {item.label || `Tab ${i + 1}`}</span>
                <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-medium dark:bg-white/10">
                  Tab drop zone
                </span>
              </div>
              <div className="min-w-0 [&_section]:py-0 [&_section>div]:px-0">
                {item.node}
              </div>
            </div>
          ))}
          {itemCount === 0 && (
            <div className="s-surface s-border s-radius s-muted border border-dashed p-6 text-center text-sm">
              No tabs added. Add tabs in the sidebar inspector.
            </div>
          )}
        </div>
      </Section>
    );
  }

  // Public / preview interactive view
  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <div className="w-full">
        {/* Tab list */}
        <div
          className={cn(
            'flex',
            alignment === 'center' ? 'justify-center' : 'justify-start'
          )}
        >
          {variant === 'pills' ? (
            <div
              role="tablist"
              aria-label="Tabs"
              className="s-surface s-border inline-flex rounded-full border p-1 text-sm font-medium"
            >
              {items.map((item, i) => {
                const active = i === activeTab;
                return (
                  <button
                    key={i}
                    ref={el => { tabsRef.current[i] = el; }}
                    type="button"
                    role="tab"
                    id={`tab-${uid}-${i}`}
                    aria-selected={active}
                    aria-controls={`tabpanel-${uid}-${i}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveTab(i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    className={cn(
                      'rounded-full px-4 py-1.5 font-medium transition',
                      active ? 's-primary-bg shadow-xs' : 's-muted hover:opacity-90'
                    )}
                  >
                    {item.label || `Tab ${i + 1}`}
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              role="tablist"
              aria-label="Tabs"
              className="s-border flex w-full border-b gap-4 text-sm"
            >
              {items.map((item, i) => {
                const active = i === activeTab;
                return (
                  <button
                    key={i}
                    ref={el => { tabsRef.current[i] = el; }}
                    type="button"
                    role="tab"
                    id={`tab-${uid}-${i}`}
                    aria-selected={active}
                    aria-controls={`tabpanel-${uid}-${i}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveTab(i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    className={cn(
                      '-mb-px border-b-2 px-4 py-2.5 font-medium transition',
                      active
                        ? 'border-[color:var(--site-primary)] s-primary-text font-semibold'
                        : 'border-transparent s-muted hover:border-[color:var(--site-border)] hover:opacity-90'
                    )}
                  >
                    {item.label || `Tab ${i + 1}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Visible panel */}
        {items[activeTab] && (
          <div
            role="tabpanel"
            id={`tabpanel-${uid}-${activeTab}`}
            aria-labelledby={`tab-${uid}-${activeTab}`}
            tabIndex={0}
            className="mt-6 min-w-0 focus:outline-hidden [&_section]:py-0 [&_section>div]:px-0"
          >
            {items[activeTab].node}
          </div>
        )}
      </div>
    </Section>
  );
}

/* =========================================================================
   3. ACCORDION
   ========================================================================= */

export type AccordionProps = WithSection & {
  items?: InteractivePanelItem[];
  panels?: InteractivePanel[];
  allowMultiple?: boolean;
};

export function Accordion(p: AccordionProps) {
  const items = panelsFrom(p);
  const itemCount = items.length;
  const allowMultiple = p.allowMultiple ?? false;
  const [openIndices, setOpenIndices] = useState<number[]>([0]);
  const uid = useId();

  const toggle = (index: number) => {
    if (allowMultiple) {
      setOpenIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      setOpenIndices(prev => (prev.includes(index) ? [] : [index]));
    }
  };

  // In editing mode, stack every panel with its label above its drop zone
  if (p.editing) {
    return (
      <Section section={p.section} editing hasItems>
        <div className="flex flex-col gap-5">
          {items.map((item, i) => (
            <div key={i} className="s-surface s-border s-radius border p-4 shadow-xs">
              <div className="s-muted mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span>Panel {i + 1}: {item.label || `Panel ${i + 1}`}</span>
                <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-medium dark:bg-white/10">
                  Accordion drop zone
                </span>
              </div>
              <div className="min-w-0 [&_section]:py-0 [&_section>div]:px-0">
                {item.node}
              </div>
            </div>
          ))}
          {itemCount === 0 && (
            <div className="s-surface s-border s-radius s-muted border border-dashed p-6 text-center text-sm">
              No panels added. Add panels in the sidebar inspector.
            </div>
          )}
        </div>
      </Section>
    );
  }

  // Public / preview interactive view
  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <div className="s-border divide-y divide-[color:var(--site-border)] border-y">
        {items.map((item, i) => {
          const isOpen = openIndices.includes(i);
          const triggerId = `accordion-trigger-${uid}-${i}`;
          const panelId = `accordion-panel-${uid}-${i}`;

          return (
            <div key={i} className="py-4">
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 text-left font-semibold transition hover:opacity-85"
              >
                <span>{item.label || `Panel ${i + 1}`}</span>
                <ChevronDown
                  className={cn(
                    's-muted size-5 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className="pt-3 min-w-0 [&_section]:py-0 [&_section>div]:px-0"
                >
                  {item.node}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
