import { Globe, LayoutTemplate, Plus, Search, Star, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Tabs } from '../primitives/Tabs';
import { BlockHoverPreview, type BlockLibraryBlock } from './BlockHoverPreview';
import { BlockIcon } from './BlockIcon';

/**
 * Block library (Elements view): Blocks / Patterns / Global tabs, search,
 * favorites, recent additions, category sections of block cards, and a hover
 * preview beside the card. Presentational: the host supplies the lists and
 * does the inserting.
 */

/** A pattern (template or preset) or a global block in the library. */
export interface BlockLibraryEntry {
  id: string;
  label: string;
  description?: string;
  /** Groups patterns under a heading. */
  category?: string;
}

export type BlockLibraryTab = 'blocks' | 'patterns' | 'global';

export interface BlockLibraryProps {
  /** Blocks in display order; sections follow the order categories first appear. */
  blocks: BlockLibraryBlock[];
  patterns?: BlockLibraryEntry[];
  globals?: BlockLibraryEntry[];
  favorites?: string[];
  /** Most recent first. */
  recents?: string[];
  onToggleFavorite?: (type: string) => void;
  onAddBlock: (type: string) => void;
  /**
   * Host-driven pointer drag. When set, a click on a card does not call
   * `onAddBlock`: the host tells click from drag. Enter/Space still add.
   */
  onBlockPointerDown?: (
    type: string,
    event: React.PointerEvent<HTMLElement>
  ) => void;
  onApplyPattern?: (entry: BlockLibraryEntry) => void;
  onAddGlobal?: (entry: BlockLibraryEntry) => void;
  /** Side the hover preview opens on; the side away from the panel's dock. */
  previewSide?: 'left' | 'right';
  defaultTab?: BlockLibraryTab;
  className?: string;
}

const OPEN_DELAY = 120;
const CLOSE_DELAY = 160;

const SECTION_TITLE =
  'flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-subtle)]';
const HINT = 'text-[10px] font-normal normal-case tracking-normal';
const ENTRY_CARD =
  'flex w-full cursor-pointer flex-col gap-1 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-3 text-start transition-colors hover:border-[var(--ne-primary)] hover:bg-[var(--ne-primary-soft)] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]';

function matches(query: string, ...texts: (string | undefined)[]) {
  return texts.some(text => text?.toLowerCase().includes(query));
}

export const BlockLibrary: React.FC<BlockLibraryProps> = ({
  blocks,
  patterns = [],
  globals = [],
  favorites = [],
  recents = [],
  onToggleFavorite,
  onAddBlock,
  onBlockPointerDown,
  onApplyPattern,
  onAddGlobal,
  previewSide = 'right',
  defaultTab = 'blocks',
  className,
}) => {
  const [tab, setTab] = useState<BlockLibraryTab>(defaultTab);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<{
    block: BlockLibraryBlock;
    anchor: HTMLElement;
  } | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  const showPreview = (block: BlockLibraryBlock, anchor: HTMLElement) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(
      () => setPreview({ block, anchor }),
      OPEN_DELAY
    );
  };
  const hidePreview = (delay = CLOSE_DELAY) => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPreview(null), delay);
  };
  const closePreview = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setPreview(null);
  };

  const add = (type: string) => {
    closePreview();
    onAddBlock(type);
  };

  const query = search.trim().toLowerCase();
  const byType = useMemo(
    () => new Map(blocks.map(block => [block.type, block])),
    [blocks]
  );
  const pick = (types: string[]) =>
    types.flatMap(type => byType.get(type) ?? []);

  const sections = useMemo(() => {
    const map = new Map<string, BlockLibraryBlock[]>();
    for (const block of blocks) {
      const list = map.get(block.category);
      if (list) list.push(block);
      else map.set(block.category, [block]);
    }
    return [...map.entries()];
  }, [blocks]);

  const results = query
    ? blocks.filter(block =>
        matches(
          query,
          block.label,
          block.type,
          block.category,
          block.description
        )
      )
    : [];
  const visiblePatterns = patterns.filter(
    entry => !query || matches(query, entry.label, entry.description, entry.category)
  );
  const visibleGlobals = globals.filter(
    entry => !query || matches(query, entry.label, entry.description)
  );

  /** Pointer and keyboard wiring shared by every way a block is shown. */
  const blockHandlers = (block: BlockLibraryBlock) => ({
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) =>
      showPreview(block, e.currentTarget),
    onPointerLeave: () => hidePreview(),
    onPointerDown: onBlockPointerDown
      ? (e: React.PointerEvent<HTMLElement>) => {
          if ((e.target as HTMLElement).closest('[data-library-star]')) return;
          closePreview();
          onBlockPointerDown(block.type, e);
        }
      : undefined,
    onClick: onBlockPointerDown ? undefined : () => add(block.type),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        add(block.type);
      }
    },
  });

  const star = (block: BlockLibraryBlock, className?: string) => {
    if (!onToggleFavorite) return null;
    const isFavorite = favorites.includes(block.type);
    return (
      <button
        type="button"
        data-library-star
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite(block.type);
        }}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Remove ${block.label} from favorites`
            : `Add ${block.label} to favorites`
        }
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className={cn(
          'cursor-pointer rounded-[var(--ne-radius-sm)] p-1 transition-colors hover:text-[var(--ne-warning)]',
          isFavorite
            ? 'text-[var(--ne-warning)]'
            : 'text-[var(--ne-text-subtle)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          className
        )}
      >
        <Star
          aria-hidden
          className={cn('h-3 w-3', isFavorite && 'fill-current')}
        />
      </button>
    );
  };

  const card = (block: BlockLibraryBlock, compact = false) => (
    // biome-ignore lint/a11y/useSemanticElements: holds a nested favorite button, so it cannot be a <button>
    <div
      key={block.type}
      role="button"
      tabIndex={0}
      aria-label={`Add ${block.label}`}
      title={block.description}
      {...blockHandlers(block)}
      className={cn(
        'group relative flex cursor-pointer touch-none select-none flex-col items-center justify-center rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] text-center transition-[border-color,background-color,scale] duration-[var(--ne-duration-fast)] hover:border-[var(--ne-primary)] hover:bg-[var(--ne-primary-soft)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)]',
        compact ? 'p-2.5' : 'p-3'
      )}
    >
      {!compact && star(block, 'absolute end-1 top-1')}
      <div className="mb-1.5 text-[var(--ne-text-muted)] transition-transform group-hover:scale-105 group-hover:text-[var(--ne-primary)]">
        <BlockIcon name={block.icon} label={block.label} className="h-5 w-5" />
      </div>
      <span className="w-full truncate text-xs font-medium text-[var(--ne-text)]">
        {block.label}
      </span>
      {!compact && block.description && (
        <span className="mt-0.5 line-clamp-1 w-full text-[10px] text-[var(--ne-text-subtle)]">
          {block.description}
        </span>
      )}
    </div>
  );

  const grid = (list: BlockLibraryBlock[]) => (
    <div className="grid grid-cols-2 gap-2">{list.map(b => card(b))}</div>
  );

  const favoriteBlocks = pick(favorites);
  const recentBlocks = pick(recents);

  const blocksTab = query ? (
    <section aria-label="Search results" className="space-y-2">
      <div className={SECTION_TITLE}>
        <span>Search Results ({results.length})</span>
        <span className={HINT}>Hover to preview</span>
      </div>
      {results.length ? (
        grid(results)
      ) : (
        <p className="py-6 text-center text-xs text-[var(--ne-text-muted)]">
          No blocks matching “{search.trim()}”
        </p>
      )}
    </section>
  ) : (
    <>
      {favoriteBlocks.length > 0 && (
        <section aria-label="Favorites" className="space-y-2">
          <div className={SECTION_TITLE}>
            <span className="flex items-center gap-1">
              <Star
                aria-hidden
                className="h-3 w-3 fill-current text-[var(--ne-warning)]"
              />
              Favorites
            </span>
            <span className={HINT}>Hover to preview</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {favoriteBlocks.map(block => card(block, true))}
          </div>
        </section>
      )}
      {recentBlocks.length > 0 && (
        <section aria-label="Recent additions" className="space-y-2">
          <div className={SECTION_TITLE}>Recent additions</div>
          <ul className="ne-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {recentBlocks.map(block => (
              <li key={block.type}>
                <button
                  type="button"
                  {...blockHandlers(block)}
                  className="inline-flex cursor-pointer touch-none items-center gap-1 whitespace-nowrap rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--ne-text)] transition-colors hover:bg-[var(--ne-surface-hover)]"
                >
                  <Plus
                    aria-hidden
                    className="h-3 w-3 text-[var(--ne-text-muted)]"
                  />
                  {block.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sections.map(([category, list]) => (
        <section key={category} aria-label={category} className="space-y-2">
          <div className={SECTION_TITLE}>
            <span>{category}</span>
            <span className={HINT}>Hover to preview</span>
          </div>
          {grid(list)}
        </section>
      ))}
    </>
  );

  const patternMap = new Map<string, BlockLibraryEntry[]>();
  for (const entry of visiblePatterns) {
    const key = entry.category ?? 'Patterns';
    const list = patternMap.get(key);
    if (list) list.push(entry);
    else patternMap.set(key, [entry]);
  }
  const patternGroups = [...patternMap.entries()];

  const patternsTab = (
    <>
      <p className="text-xs text-[var(--ne-text-muted)]">
        Pre-built multi-block compositions designed for instant reuse.
      </p>
      {patternGroups.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--ne-text-muted)]">
          {query ? `No patterns matching “${search.trim()}”` : 'No patterns yet'}
        </p>
      )}
      {patternGroups.map(([category, list]) => (
        <section key={category} aria-label={category} className="space-y-2">
          <div className={SECTION_TITLE}>{category}</div>
          {list.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onApplyPattern?.(entry)}
              className={ENTRY_CARD}
            >
              <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--ne-text)]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <LayoutTemplate
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-[var(--ne-primary)]"
                  />
                  <span className="truncate">{entry.label}</span>
                </span>
                <Plus
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-[var(--ne-primary)]"
                />
              </span>
              {entry.description && (
                <span className="text-[11px] text-[var(--ne-text-muted)]">
                  {entry.description}
                </span>
              )}
            </button>
          ))}
        </section>
      ))}
    </>
  );

  const globalTab = (
    <>
      <p className="text-xs text-[var(--ne-text-muted)]">
        Synchronized global blocks linked across multiple pages and layouts.
      </p>
      {visibleGlobals.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--ne-text-muted)]">
          {query
            ? `No global blocks matching “${search.trim()}”`
            : 'No global blocks yet'}
        </p>
      )}
      {visibleGlobals.map(entry => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onAddGlobal?.(entry)}
          className={ENTRY_CARD}
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ne-text)]">
            <Globe
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 text-[var(--ne-primary)]"
            />
            <span className="truncate">{entry.label}</span>
          </span>
          {entry.description && (
            <span className="text-[11px] text-[var(--ne-text-muted)]">
              {entry.description}
            </span>
          )}
        </button>
      ))}
    </>
  );

  return (
    <div
      className={cn(
        'flex h-full select-none flex-col bg-[var(--ne-surface)]',
        className
      )}
    >
      <div className="space-y-2 border-b border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-2">
        <Tabs
          ariaLabel="Library"
          items={[
            { id: 'blocks', label: 'Blocks' },
            { id: 'patterns', label: 'Patterns' },
            { id: 'global', label: 'Global' },
          ]}
          activeId={tab}
          onChange={id => {
            closePreview();
            setTab(id as BlockLibraryTab);
          }}
        />
        <div className="relative flex items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-[var(--ne-text-subtle)]"
          />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks or components..."
            aria-label="Search blocks or components"
            className="h-7 w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] pe-7 ps-8 text-xs text-[var(--ne-text)] placeholder:text-[var(--ne-text-subtle)] focus:border-[var(--ne-primary)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute end-2 cursor-pointer text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-label={tab}
        className="ne-scrollbar flex-1 space-y-4 overflow-y-auto p-3"
      >
        {tab === 'blocks' && blocksTab}
        {tab === 'patterns' && patternsTab}
        {tab === 'global' && globalTab}
      </div>

      <BlockHoverPreview
        block={preview?.block ?? null}
        anchor={preview?.anchor ?? null}
        side={previewSide}
        isFavorite={!!preview && favorites.includes(preview.block.type)}
        onToggleFavorite={onToggleFavorite}
        onAdd={add}
        onClose={closePreview}
        onPointerEnter={() => clearTimeout(closeTimer.current)}
        onPointerLeave={() => hidePreview(OPEN_DELAY)}
      />
    </div>
  );
};
