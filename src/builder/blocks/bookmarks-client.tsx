'use client';

import { Bookmark, BookmarkCheck, X } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useConsent } from '@/components/site/consent-provider';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el, linkEl } from './element';
import { SiteOverlay } from './site-overlay-client';

/**
 * Visitor bookmarks, kept in this browser only (localStorage). Nothing is sent
 * to the server. All bookmark widgets on a page stay in sync through a custom
 * event and the `storage` event (other tabs).
 */
export type SavedItem = { url: string; title: string; image?: string | null };

const KEY = 'site_bookmarks';
const EVENT = 'site-bookmarks-change';
const MAX = 100;

function read(): SavedItem[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter(
          (i): i is SavedItem =>
            i && typeof i.url === 'string' && typeof i.title === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

function write(items: SavedItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    // storage unavailable (private mode) — keep the in-memory state only
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Same-origin path only, so a saved entry can't point anywhere else. */
function safePath(url: string): string | null {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

export function useBookmarks() {
  const { hasConsent } = useConsent();
  const functionalAllowed = hasConsent('functional');
  const [items, setItems] = useState<SavedItem[]>([]);
  useEffect(() => {
    if (!functionalAllowed) {
      setItems([]);
      return;
    }
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [functionalAllowed]);
  const toggle = useCallback(
    (item: SavedItem) => {
      const path = safePath(item.url);
      if (!path) return;
      if (!functionalAllowed) {
        setItems(prev => {
          const exists = prev.some(i => i.url === path);
          return exists
            ? prev.filter(i => i.url !== path)
            : [{ ...item, url: path }, ...prev].slice(0, MAX);
        });
        return;
      }
      const current = read();
      const exists = current.some(i => i.url === path);
      write(
        exists
          ? current.filter(i => i.url !== path)
          : [{ ...item, url: path }, ...current]
      );
    },
    [functionalAllowed]
  );
  const remove = useCallback(
    (url: string) => {
      if (!functionalAllowed) {
        setItems(prev => prev.filter(i => i.url !== url));
        return;
      }
      write(read().filter(i => i.url !== url));
    },
    [functionalAllowed]
  );
  const has = useCallback(
    (url: string) => {
      const path = typeof window === 'undefined' ? url : safePath(url);
      return items.some(i => i.url === path);
    },
    [items]
  );
  return { items, toggle, remove, has };
}

/** Save / unsave one item (post, entry, loop card). */
export function BookmarkToggle({
  url,
  title,
  image,
  label,
  className,
  elements,
}: {
  /** Defaults to the current page. */
  url?: string;
  title: string;
  image?: string | null;
  /** Visible text next to the icon; icon-only when empty. */
  label?: string;
  className?: string;
  elements?: Record<string, ElementStyle>;
}) {
  const { has, toggle } = useBookmarks();
  const [here, setHere] = useState('');
  useEffect(() => setHere(window.location.pathname), []);
  const target = url || here;
  const saved = target ? has(target) : false;
  const text = saved ? 'Remove bookmark' : 'Save bookmark';
  return (
    <button
      type="button"
      onClick={() => target && toggle({ url: target, title, image })}
      aria-pressed={saved}
      aria-label={label ? undefined : text}
      title={text}
      {...el(
        { elements },
        'button',
        cn(
          label ? 's-btn s-btn-outline' : 's-icon-btn s-border border',
          saved && 'text-[var(--site-primary)]',
          className
        )
      )}
    >
      {saved ? (
        <BookmarkCheck className="size-4" aria-hidden />
      ) : (
        <Bookmark className="size-4" aria-hidden />
      )}
      {label ? <span>{saved ? 'Saved' : label}</span> : null}
    </button>
  );
}

/** Header button with a count, opening a drawer of saved items. */
export function BookmarksDrawer({
  title = 'Saved',
  emptyText = 'Nothing saved yet. Use the bookmark button on a post to keep it here.',
  elements,
}: {
  title?: string;
  emptyText?: string;
  elements?: Record<string, ElementStyle>;
}) {
  const { items, remove } = useBookmarks();
  const [open, setOpen] = useState(false);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        {...el({ elements }, 'trigger', 's-icon-btn relative')}
        aria-label={`${title} (${items.length})`}
        title={title}
        aria-haspopup="dialog"
      >
        <Bookmark className="size-4" aria-hidden />
        {items.length > 0 && (
          <span
            {...el(
              { elements },
              'badge',
              'absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--site-primary)] px-1 text-[10px] font-semibold leading-4 text-[var(--site-on-primary)]'
            )}
          >
            {items.length}
          </span>
        )}
      </button>
      <SiteOverlay open={open}>
        <div className="fixed inset-0 z-[100] flex justify-end">
          <button
            type="button"
            aria-label="Close"
            className="s-ov-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            {...el(
              { elements },
              'panel',
              's-ov-right s-border relative flex h-full w-full max-w-sm flex-col border-s bg-[var(--site-bg)] text-[var(--site-fg)] shadow-2xl'
            )}
          >
            <div className="s-border flex items-center justify-between border-b px-5 py-4">
              <h2
                id={headingId}
                {...el({ elements }, 'title', 'text-lg font-medium')}
              >
                {title}
                <span className="s-muted ms-2 text-sm">{items.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                {...el({ elements }, 'close', 's-icon-btn')}
                aria-label="Close"
                // biome-ignore lint/a11y/noAutofocus: dialog focus target
                autoFocus
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {items.length ? (
              <ul className="s-ov-stagger flex-1 space-y-1 overflow-y-auto p-3">
                {items.map(item => (
                  <li
                    key={item.url}
                    {...el(
                      { elements },
                      'item',
                      'group flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--site-surface)]'
                    )}
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt=""
                        {...el(
                          { elements },
                          'thumbnail',
                          'size-12 shrink-0 rounded-lg object-cover'
                        )}
                      />
                    ) : null}
                    <a
                      href={item.url}
                      {...linkEl(
                        { elements },
                        'itemTitle',
                        'line-clamp-2 min-w-0 flex-1 text-sm font-medium hover:underline'
                      )}
                    >
                      {item.title}
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(item.url)}
                      {...el(
                        { elements },
                        'remove',
                        's-icon-btn size-8 shrink-0'
                      )}
                      aria-label={`Remove ${item.title}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p {...el({ elements }, 'empty', 's-muted p-6 text-sm')}>
                {emptyText}
              </p>
            )}
          </div>
        </div>
      </SiteOverlay>
    </>
  );
}
