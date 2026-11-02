'use client';

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Menu as MenuIcon,
  Moon,
  MoreVertical,
  Search as SearchIcon,
  Sun,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { menuHref } from '@/components/site/menu-links';
import type { MenuWithItems } from '@/server/services/public-site.service';
import { liveSearch, type LiveSearchResultItem } from '@/server/actions/site-chrome.actions';

/* =========================================================================
   MobileMenu Client Component
   ========================================================================= */

export type MobileMenuClientProps = {
  breakpoint?: 'mobile' | 'tablet';
  drawerSide?: 'left' | 'right' | 'full';
  icon?: 'menu' | 'dots';
  showSearch?: boolean;
  menu?: MenuWithItems | null;
  siteSlug?: string;
};

export function MobileMenuClient({
  breakpoint = 'mobile',
  drawerSide = 'right',
  icon = 'menu',
  showSearch = false,
  menu,
  siteSlug,
}: MobileMenuClientProps) {
  const [open, setOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape & trap scroll
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const toggleSubmenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const visibilityClass = breakpoint === 'tablet' ? 'lg:hidden' : 'md:hidden';

  const drawerPositionClass =
    drawerSide === 'full'
      ? 'inset-0 w-full'
      : drawerSide === 'left'
        ? 'inset-y-0 left-0 w-full max-w-sm border-r'
        : 'inset-y-0 right-0 w-full max-w-sm border-l';

  return (
    <div className={visibilityClass}>
      {/* Trigger Toggle Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open mobile menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-md p-2 text-steel-700 hover:bg-steel-100 hover:text-steel-900 dark:text-steel-300 dark:hover:bg-dark-200 dark:hover:text-white transition-colors"
      >
        {icon === 'dots' ? (
          <MoreVertical className="size-5" />
        ) : (
          <MenuIcon className="size-5" />
        )}
      </button>

      {/* Drawer Overlay & Content */}
      {open && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Pane */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className={cn(
              'relative z-10 flex flex-col bg-[var(--site-bg)] text-[var(--site-text)] shadow-2xl border-steel-200 dark:border-dark-300',
              drawerPositionClass
            )}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-steel-200 dark:border-dark-300 px-5 py-4">
              <span className="font-semibold text-sm">Navigation</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-steel-500 hover:bg-steel-100 dark:hover:bg-dark-200 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Optional Search */}
            {showSearch && (
              <div className="border-b border-steel-200 dark:border-dark-300 p-4">
                <SearchBoxClient
                  mode="inline"
                  placeholder="Search..."
                  siteSlug={siteSlug}
                  align="left"
                  className="w-full"
                />
              </div>
            )}

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <ul className="flex flex-col space-y-1">
                {(menu?.items || []).map(item => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = !!expandedItems[item.id];
                  const href = menuHref(item.url, siteSlug);

                  return (
                    <li key={item.id} className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className="flex-1 py-2.5 text-base font-medium hover:text-[var(--site-primary)] transition-colors"
                        >
                          {item.label}
                        </Link>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={e => toggleSubmenu(item.id, e)}
                            aria-expanded={isExpanded}
                            className="p-2 text-steel-400 hover:text-steel-700 dark:hover:text-steel-200"
                          >
                            <ChevronDown
                              className={cn(
                                'size-4 transition-transform duration-200',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <ul className="ml-4 flex flex-col space-y-1 border-l border-steel-200 dark:border-dark-300 pl-3 py-1">
                          {item.children.map(child => (
                            <li key={child.id}>
                              <Link
                                href={menuHref(child.url, siteSlug)}
                                onClick={() => setOpen(false)}
                                className="block py-1.5 text-sm text-steel-600 hover:text-[var(--site-primary)] dark:text-steel-400 transition-colors"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SearchBox Client Component
   ========================================================================= */

export type SearchBoxClientProps = {
  mode?: 'inline' | 'icon-modal';
  placeholder?: string;
  liveResults?: boolean;
  align?: 'left' | 'right';
  siteSlug?: string;
  language?: string;
  className?: string;
};

export function SearchBoxClient({
  mode = 'inline',
  placeholder = 'Search...',
  liveResults = true,
  align = 'right',
  siteSlug,
  language,
  className,
}: SearchBoxClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<LiveSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFlyout, setShowFlyout] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPath = siteSlug ? `/${siteSlug}/search` : '/search';
  const fullSearchUrl = `${searchPath}?q=${encodeURIComponent(query.trim())}`;
  const listboxId = 'site-search-suggestions-listbox';
  const isFlyoutVisible = Boolean(
    showFlyout && liveResults && query.trim().length >= 2
  );
  const activeOptionId =
    isFlyoutVisible && activeIndex >= 0
      ? `site-search-opt-${activeIndex}`
      : undefined;

  useEffect(() => {
    if (modalOpen) {
      inputRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (showFlyout) {
            setShowFlyout(false);
          } else {
            setModalOpen(false);
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [modalOpen, showFlyout]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowFlyout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);

    if (!liveResults) return;

    if (val.trim().length < 2) {
      setHits([]);
      setShowFlyout(false);
      setLoading(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    setLoading(true);
    setShowFlyout(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await liveSearch({
          query: val,
          language,
          limit: 6,
        });
        setHits(results);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showFlyout || (!hits.length && !loading)) {
      return;
    }

    const totalItems = hits.length > 0 ? hits.length + 1 : 0;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < hits.length) {
        e.preventDefault();
        const target = hits[activeIndex];
        setShowFlyout(false);
        if (mode === 'icon-modal') setModalOpen(false);
        router.push(target.path);
      } else if (activeIndex === hits.length) {
        e.preventDefault();
        setShowFlyout(false);
        if (mode === 'icon-modal') setModalOpen(false);
        router.push(fullSearchUrl);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowFlyout(false);
      setActiveIndex(-1);
    }
  };

  const handleInputFocus = () => {
    if (
      liveResults &&
      query.trim().length >= 2 &&
      (hits.length > 0 || loading)
    ) {
      setShowFlyout(true);
    }
  };

  const renderDropdownContent = () => {
    if (!isFlyoutVisible) return null;

    return (
      <div
        id={listboxId}
        role="listbox"
        aria-label="Search suggestions"
        className={cn(
          'overflow-hidden rounded-xl border border-steel-200 bg-[var(--site-bg)] p-1.5 shadow-2xl dark:border-dark-300',
          mode === 'inline'
            ? cn(
                'absolute top-full mt-2 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-2rem)] z-50',
                align === 'right' ? 'right-0' : 'left-0'
              )
            : 'mt-3 w-full border-t border-steel-100 dark:border-dark-200 pt-3'
        )}
      >
        {loading && hits.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-steel-500">
            <Loader2 className="size-4 animate-spin text-[var(--site-primary)]" />
            <span>Searching...</span>
          </div>
        ) : hits.length === 0 ? (
          <div className="py-4 text-center text-xs text-steel-500">
            No matches for &ldquo;
            <span className="font-medium text-steel-700 dark:text-steel-300">
              {query}
            </span>
            &rdquo;
          </div>
        ) : (
          <>
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-steel-400">
              Results
            </div>
            <ul className="flex flex-col gap-0.5">
              {hits.map((hit, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <li
                    key={`${hit.kind}-${hit.path}`}
                    id={`site-search-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <Link
                      href={hit.path}
                      onClick={() => {
                        setShowFlyout(false);
                        if (mode === 'icon-modal') setModalOpen(false);
                      }}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors',
                        isSelected
                          ? 'bg-steel-100 text-[var(--site-primary)] dark:bg-dark-200'
                          : 'hover:bg-steel-100 dark:hover:bg-dark-200 text-[var(--site-text)]'
                      )}
                    >
                      <div className="mt-0.5 shrink-0 text-steel-400">
                        {hit.kind === 'post' ? (
                          <BookOpen className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{hit.title}</span>
                          <span className="shrink-0 rounded bg-steel-100 dark:bg-dark-300 px-1 py-0.5 text-[9px] uppercase tracking-wider font-semibold text-steel-500">
                            {hit.kind}
                          </span>
                        </div>
                        {hit.snippet && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-steel-400">
                            {hit.snippet}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div
              id={`site-search-opt-${hits.length}`}
              role="option"
              aria-selected={activeIndex === hits.length}
              className="mt-1 border-t border-steel-200 dark:border-dark-300 pt-1"
            >
              <Link
                href={fullSearchUrl}
                onClick={() => {
                  setShowFlyout(false);
                  if (mode === 'icon-modal') setModalOpen(false);
                }}
                className={cn(
                  'block rounded-md px-2.5 py-1.5 text-center text-xs font-medium text-[var(--site-primary)] transition-colors',
                  activeIndex === hits.length
                    ? 'bg-steel-100 dark:bg-dark-200'
                    : 'hover:bg-steel-50 dark:hover:bg-dark-200'
                )}
              >
                View all results for &ldquo;{query}&rdquo; &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    );
  };

  if (mode === 'icon-modal') {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => {
            setModalOpen(true);
            setActiveIndex(-1);
          }}
          aria-label="Open search"
          className="inline-flex items-center justify-center rounded-md p-2 text-steel-600 hover:bg-steel-100 dark:text-steel-400 dark:hover:bg-dark-200 transition-colors"
        >
          <SearchIcon className="size-4" />
        </button>

        {modalOpen && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center pt-20 px-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setModalOpen(false);
                setShowFlyout(false);
              }}
            />
            <div
              ref={containerRef}
              className="relative z-10 w-full max-w-lg rounded-xl border border-steel-200 bg-[var(--site-bg)] p-4 shadow-2xl dark:border-dark-300"
            >
              <form action={searchPath} method="GET" className="relative">
                <SearchIcon className="absolute left-3 top-3 size-5 text-steel-400" />
                <input
                  ref={inputRef}
                  type="search"
                  name="q"
                  role="combobox"
                  aria-expanded={isFlyoutVisible}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  aria-autocomplete="list"
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-steel-200 bg-transparent py-2.5 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-dark-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setShowFlyout(false);
                  }}
                  className="absolute right-2.5 top-2.5 rounded p-1 text-steel-400 hover:text-steel-600"
                >
                  <X className="size-4" />
                </button>
              </form>

              {renderDropdownContent()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className || 'w-48 sm:w-64')}
    >
      <form action={searchPath} method="GET" className="relative w-full">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-steel-400" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          role="combobox"
          aria-expanded={isFlyoutVisible}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full rounded-md border border-steel-200 bg-[var(--site-surface)] py-1.5 pl-8 pr-3 text-xs placeholder:text-steel-400 focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-300"
        />
      </form>
      {renderDropdownContent()}
    </div>
  );
}

/* =========================================================================
   AnnouncementBar Client Component
   ========================================================================= */

export type AnnouncementBarClientProps = {
  text?: string;
  link?: string;
  dismissible?: boolean;
  dismissDays?: number;
  startsAt?: string;
  endsAt?: string;
};

export function AnnouncementBarClient({
  text = 'Welcome to our newly designed website!',
  link,
  dismissible = true,
  dismissDays = 7,
  startsAt,
  endsAt,
}: AnnouncementBarClientProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid layout shift before checking storage

  useEffect(() => {
    // Schedule check
    const now = new Date();
    if (startsAt && new Date(startsAt) > now) return;
    if (endsAt && new Date(endsAt) < now) return;

    if (!dismissible) {
      setDismissed(false);
      return;
    }

    // Dismissal check
    try {
      const storageKey = `announcement_dismissed_${btoa(text).slice(0, 16)}`;
      const dismissedUntil = localStorage.getItem(storageKey);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return; // still dismissed
      }
    } catch {
      // storage unavailable
    }
    setDismissed(false);
  }, [text, dismissible, startsAt, endsAt]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const storageKey = `announcement_dismissed_${btoa(text).slice(0, 16)}`;
      const expireTime = Date.now() + (dismissDays || 7) * 24 * 60 * 60 * 1000;
      localStorage.setItem(storageKey, expireTime.toString());
    } catch {
      // storage unavailable
    }
  };

  if (dismissed || !text) return null;

  return (
    <div className="relative w-full bg-[var(--site-primary)] text-white px-4 py-2 text-xs sm:text-sm font-medium transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-center text-center pr-8 sm:pr-0">
        {link ? (
          <a
            href={link}
            className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:opacity-90"
          >
            <span>{text}</span>
          </a>
        ) : (
          <span>{text}</span>
        )}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   BackToTop Client Component
   ========================================================================= */

export type BackToTopClientProps = {
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  showAfter?: number;
  icon?: 'arrow' | 'chevron';
  label?: string;
  editing?: boolean;
};

export function BackToTopClient({
  position = 'bottom-right',
  showAfter = 300,
  icon = 'arrow',
  label = '',
  editing = false,
}: BackToTopClientProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (position === 'inline' || editing) {
      setVisible(true);
      return;
    }

    const handleScroll = () => {
      setVisible(window.scrollY >= showAfter);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [position, showAfter, editing]);

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  if (!visible && position !== 'inline') return null;

  const posClasses =
    position === 'bottom-left'
      ? 'fixed bottom-6 left-6 z-40'
      : position === 'bottom-right'
        ? 'fixed bottom-6 right-6 z-40'
        : 'relative inline-flex';

  const IconComponent = icon === 'chevron' ? ChevronUp : ArrowUp;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label || 'Back to top'}
      title={label || 'Back to top'}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-full shadow-md transition-all duration-200',
        'bg-[var(--site-bg,#ffffff)] text-[var(--site-text,#1e293b)] border border-steel-200 dark:border-dark-300',
        'hover:bg-steel-50 hover:shadow-lg dark:hover:bg-dark-200 hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-[var(--site-primary,#3b82f6)]',
        label ? 'px-4 py-2 text-xs font-medium' : 'p-3',
        posClasses
      )}
    >
      <IconComponent className="size-4 transition-transform group-hover:-translate-y-0.5" />
      {label && <span>{label}</span>}
    </button>
  );
}

/* =========================================================================
   ThemeToggle Client Component
   ========================================================================= */

export type ThemeToggleClientProps = {
  icon?: 'sun-moon' | 'circle';
  align?: 'left' | 'center' | 'right';
};

export function ThemeToggleClient({
  icon = 'sun-moon',
  align = 'center',
}: ThemeToggleClientProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.site-root, [data-site-theme]');
    const current = root?.getAttribute('data-site-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const root = document.querySelector<HTMLElement>('.site-root, [data-site-theme]');
    if (root) {
      root.setAttribute('data-site-theme', next);
    }
    try {
      document.cookie = `site_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // cookie unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="inline-flex items-center justify-center rounded-md p-2 text-steel-600 hover:bg-steel-100 hover:text-steel-900 dark:text-steel-300 dark:hover:bg-dark-200 dark:hover:text-white transition-colors"
    >
      {theme === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
