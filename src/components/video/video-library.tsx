'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Play,
  X,
  ExternalLink,
  Video as VideoIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { parseVideoUrl } from '@/lib/video/parse';
import type { ParsedVideo } from '@/lib/video/parse';
import { saveVideoProgress } from '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions';
import { el, type ElementStyle } from '@/builder/blocks/element';
import { Section, type SectionSettings } from '@/builder/blocks/section';
import { OverlayTrigger } from '@/builder/blocks/overlay-trigger';
import { VideoPlayer } from './video-player';

export type VideoLibraryVideoItem = {
  id: string;
  siteId: string;
  playlistId: string | null;
  title: string;
  slug: string;
  url: string;
  provider: 'youtube' | 'vimeo' | 'direct';
  providerId: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: string;
  visibility: string;
  publishedAt?: Date | string | null;
  playlistName?: string | null;
  /** Saved resume position / completion for the current viewer. */
  position?: number;
  completed?: boolean;
};

export type VideoLibrarySettings = {
  enabled: boolean;
  title: string;
  description: string;
  layout: 'sidebar' | 'stacked' | 'grid';
  columns?: 2 | 3 | 4;
  overlayId?: string | null;
  defaultPlaylistId: string | null;
  thumbnails: boolean;
  descriptions: boolean;
  pageSize: number;
  providers: Record<string, boolean>;
  progress: boolean;
  resume: boolean;
  completionPercent: number;
  source?:
    'all' | 'youtube' | 'vimeo' | 'direct' | ('youtube' | 'vimeo' | 'direct')[];
  sources?: ('youtube' | 'vimeo' | 'direct')[];
  showSearch?: boolean;
  searchPlaceholder?: string;
};

export type VideoLibraryProps = {
  videos?: VideoLibraryVideoItem[];
  settings?: Partial<VideoLibrarySettings> | null;
  title?: string;
  description?: string;
  layout?: 'sidebar' | 'stacked' | 'grid';
  columns?: 2 | 3 | 4;
  overlayId?: string | null;
  source?:
    'all' | 'youtube' | 'vimeo' | 'direct' | ('youtube' | 'vimeo' | 'direct')[];
  sources?: ('youtube' | 'vimeo' | 'direct')[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  defaultPlaylistId?: string | null;
  /** Block-level playlist override. */
  playlistId?: string | null;
  editing?: boolean;
  section?: SectionSettings;
  elements?: Record<string, ElementStyle>;
  /** Reports playback position / completion while the viewer plays. */
  onProgress?: (progress: {
    videoId: string;
    position: number;
    duration: number | null;
    completed: boolean;
  }) => void | Promise<void>;
};

/** Grid card link or button; keeps a visible focus ring for keyboard users. */
const GRID_CARD_CLASS =
  'group block h-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-primary)] focus-visible:ring-offset-2';

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

const DEMO_VIDEOS: VideoLibraryVideoItem[] = [
  {
    id: 'demo-yt-1',
    siteId: 'demo',
    playlistId: null,
    title: 'Introducing Next CMS Visual Builder',
    slug: 'introducing-next-cms-visual-builder',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    provider: 'youtube',
    providerId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    duration: 213,
    status: 'published',
    visibility: 'public',
  },
  {
    id: 'demo-vimeo-1',
    siteId: 'demo',
    playlistId: null,
    title: 'Creative Storytelling & Showcase',
    slug: 'creative-storytelling-showcase',
    url: 'https://vimeo.com/76979871',
    provider: 'vimeo',
    providerId: '76979871',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&q=80',
    duration: 185,
    status: 'published',
    visibility: 'public',
  },
  {
    id: 'demo-yt-2',
    siteId: 'demo',
    playlistId: null,
    title: 'Responsive Video & Embed Layouts',
    slug: 'responsive-video-embed-layouts',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    provider: 'youtube',
    providerId: 'jNQXAC9IVRw',
    thumbnailUrl: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    duration: 19,
    status: 'published',
    visibility: 'public',
  },
];

/**
 * VideoLibraryBlock — Puck-facing wrapper around the public video library
 * widget. Reports playback progress to the server via `saveVideoProgress`
 * while the widget setting is on.
 */
export function VideoLibraryBlock(
  props: Omit<VideoLibraryProps, 'onProgress'>
) {
  const handleProgress = useCallback(
    async (progress: {
      videoId: string;
      position: number;
      duration: number | null;
      completed: boolean;
    }) => {
      await saveVideoProgress({
        videoId: progress.videoId,
        position: progress.position,
        duration: progress.duration,
        completed: progress.completed,
      });
    },
    []
  );

  return <VideoLibrary {...props} onProgress={handleProgress} />;
}

/**
 * VideoLibrary — public video library widget.
 *
 * Lists published videos and swaps the player without a route change.
 *
 * - `sidebar`: list beside the player, stacked below `lg`.
 * - `stacked`: list stacked above the player.
 */
export function VideoLibrary({
  videos,
  settings,
  title,
  description,
  layout = 'sidebar',
  columns,
  overlayId,
  source = 'all',
  sources,
  showSearch = true,
  searchPlaceholder,
  defaultPlaylistId = null,
  playlistId = null,
  editing = false,
  section,
  elements,
  onProgress,
}: VideoLibraryProps) {
  const allowedSources = useMemo<('youtube' | 'vimeo' | 'direct')[]>(() => {
    if (Array.isArray(sources) && sources.length > 0) return sources;
    if (Array.isArray(settings?.sources) && settings.sources.length > 0)
      return settings.sources;
    if (Array.isArray(source) && source.length > 0)
      return source as ('youtube' | 'vimeo' | 'direct')[];
    if (typeof source === 'string' && source !== 'all')
      return [source as 'youtube' | 'vimeo' | 'direct'];
    if (typeof settings?.source === 'string' && settings.source !== 'all') {
      return [settings.source as 'youtube' | 'vimeo' | 'direct'];
    }
    return ['youtube', 'vimeo', 'direct'];
  }, [sources, settings?.sources, source, settings?.source]);

  const isDemo = editing && (!videos || videos.length === 0);
  const items = useMemo(() => {
    if (videos && videos.length > 0) return videos;
    if (isDemo) {
      const demoMatches = DEMO_VIDEOS.filter(v =>
        allowedSources.includes(v.provider)
      );
      return demoMatches.length > 0 ? demoMatches : DEMO_VIDEOS;
    }
    return [];
  }, [videos, isDemo, allowedSources]);

  const configuredLayout = layout || settings?.layout || 'sidebar';
  const shouldShowSearch = showSearch ?? settings?.showSearch ?? true;

  const resolvedSettings: VideoLibrarySettings = {
    enabled: settings?.enabled ?? true,
    title: settings?.title ?? title ?? 'Videos',
    description: settings?.description ?? description ?? '',
    layout: configuredLayout,
    source,
    sources: allowedSources,
    showSearch: shouldShowSearch,
    searchPlaceholder: searchPlaceholder || settings?.searchPlaceholder,
    defaultPlaylistId: settings?.defaultPlaylistId ?? defaultPlaylistId ?? null,
    thumbnails: settings?.thumbnails ?? true,
    descriptions: settings?.descriptions ?? true,
    pageSize: settings?.pageSize ?? 12,
    providers: settings?.providers ?? {
      youtube: true,
      vimeo: true,
      direct: true,
    },
    progress: settings?.progress ?? true,
    resume: settings?.resume ?? true,
    completionPercent: settings?.completionPercent ?? 0.9,
  };

  // State for active source tab within the widget (if multiple sources are allowed)
  const [activeSourceFilter, setActiveSourceFilter] = useState<
    'all' | 'youtube' | 'vimeo' | 'direct'
  >(allowedSources.length === 1 ? allowedSources[0] : 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep in sync if allowedSources changes in builder inspector
  useEffect(() => {
    if (allowedSources.length === 1) {
      setActiveSourceFilter(allowedSources[0]);
    } else if (
      activeSourceFilter !== 'all' &&
      !allowedSources.includes(activeSourceFilter)
    ) {
      setActiveSourceFilter('all');
    }
  }, [allowedSources, activeSourceFilter]);

  const scopedByPlaylist = useMemo(() => {
    const scoped = playlistId
      ? items.filter(v => v.playlistId === playlistId)
      : items;
    const finalList = resolvedSettings.defaultPlaylistId
      ? scoped.filter(v => v.playlistId === resolvedSettings.defaultPlaylistId)
      : scoped;
    return finalList;
  }, [items, playlistId, resolvedSettings.defaultPlaylistId]);

  // Filter by allowed sources, active source filter tab, and search query
  const filtered = useMemo(() => {
    // Only include videos from configured allowed sources
    let result = scopedByPlaylist.filter(v =>
      allowedSources.includes(v.provider)
    );

    // Filter by user-selected tab within allowed sources
    if (activeSourceFilter !== 'all') {
      result = result.filter(v => v.provider === activeSourceFilter);
    }

    // Filter by keyword query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        v =>
          v.title.toLowerCase().includes(q) ||
          v.slug.toLowerCase().includes(q) ||
          v.provider.toLowerCase().includes(q)
      );
    }

    const limited =
      resolvedSettings.pageSize > 0
        ? result.slice(0, resolvedSettings.pageSize)
        : result;
    return limited;
  }, [
    scopedByPlaylist,
    allowedSources,
    activeSourceFilter,
    searchQuery,
    resolvedSettings.pageSize,
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    filtered.find(v => v.id === selectedId) ?? filtered[0] ?? items[0] ?? null;

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
    if (
      selected &&
      !filtered.some(v => v.id === selected.id) &&
      filtered.length > 0
    ) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selected]);

  const handleProgress = useCallback(
    (p: { position: number; duration: number | null; completed: boolean }) => {
      if (!selected || !resolvedSettings.progress || editing) return;
      onProgress?.({
        videoId: selected.id,
        position: p.position,
        duration: p.duration,
        completed: p.completed,
      });
    },
    [selected, resolvedSettings.progress, editing, onProgress]
  );

  const handleEnded = useCallback(() => {
    if (!selected || !resolvedSettings.progress || editing) return;
    onProgress?.({
      videoId: selected.id,
      position: selected.duration ?? 0,
      duration: selected.duration,
      completed: true,
    });
  }, [selected, resolvedSettings.progress, editing, onProgress]);

  if (!resolvedSettings.enabled && !editing) return null;
  if (items.length === 0 && !editing) return null;

  const parsed: ParsedVideo | null = selected
    ? parseVideoUrl(selected.url)
    : null;
  const unavailable =
    !!selected && resolvedSettings.providers?.[selected.provider] === false;

  const currentPlaceholder =
    resolvedSettings.searchPlaceholder ||
    (activeSourceFilter === 'youtube'
      ? 'Search YouTube videos…'
      : activeSourceFilter === 'vimeo'
        ? 'Search Vimeo videos…'
        : activeSourceFilter === 'direct'
          ? 'Search direct videos…'
          : allowedSources.length === 1 && allowedSources[0] === 'youtube'
            ? 'Search YouTube videos…'
            : allowedSources.length === 1 && allowedSources[0] === 'vimeo'
              ? 'Search Vimeo videos…'
              : 'Search video library…');

  const titleEl = el(
    { elements },
    'title',
    'text-2xl font-bold tracking-tight'
  );
  const descEl = el({ elements }, 'description', 's-muted mt-1 text-sm');
  const playerEl = el(
    { elements },
    'player',
    'relative bg-black rounded-xl overflow-hidden aspect-video shadow-md ring-1 ring-black/10'
  );
  const nowPlayingEl = el({ elements }, 'nowPlaying', 'text-lg font-semibold');
  const searchEl = el(
    { elements },
    'search',
    's-border h-9 w-full rounded-lg border bg-[var(--site-bg)] pl-9 pr-8 text-sm text-[var(--site-fg)] transition placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]'
  );
  const filterEl = el({ elements }, 'filter');
  const listItemEl = el({ elements }, 'listItem');
  const thumbEl = el(
    { elements },
    'thumbnail',
    'h-full w-full object-cover transition group-hover:scale-105'
  );
  const listTitleEl = el(
    { elements },
    'listTitle',
    'block truncate text-sm font-medium text-[var(--site-fg)] transition group-hover:text-[var(--site-primary)]'
  );
  const badgeEl = el({ elements }, 'badge');

  const player = selected ? (
    <div className="flex flex-col gap-3">
      <div className={playerEl.className} style={playerEl.style}>
        {unavailable || !parsed ? (
          <div className="s-surface absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="s-muted text-sm">
              This video is currently unavailable.
            </p>
          </div>
        ) : (
          <VideoPlayer
            parsed={parsed}
            startPosition={
              resolvedSettings.resume ? (selected.position ?? null) : null
            }
            poster={resolvedSettings.thumbnails ? selected.thumbnailUrl : null}
            duration={selected.duration ?? undefined}
            title={selected.title}
            lockSeek={
              resolvedSettings.progress ? selected.provider === 'direct' : false
            }
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        )}
      </div>

      <div className="flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-center">
        <div>
          <h3 className={nowPlayingEl.className} style={nowPlayingEl.style}>
            {selected.title}
          </h3>
          <div className="s-muted mt-0.5 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium capitalize',
                selected.provider === 'youtube'
                  ? 'bg-red-500/10 text-red-500'
                  : selected.provider === 'vimeo'
                    ? 'bg-sky-500/10 text-sky-500'
                    : 'bg-violet-500/10 text-violet-500',
                badgeEl.className
              )}
              style={badgeEl.style}
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              {selected.provider}
            </span>
            {selected.duration ? (
              <span>{formatDuration(selected.duration)}</span>
            ) : null}
            {selected.playlistName ? (
              <span>• {selected.playlistName}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="s-surface flex aspect-video flex-col items-center justify-center rounded-xl p-6 text-center">
      <VideoIcon className="s-muted mb-2 h-10 w-10" />
      <p className="s-muted text-sm font-medium">No video selected</p>
    </div>
  );

  const searchControls = (
    <div className="mb-3 flex flex-col gap-2.5">
      {/* Search Input */}
      {resolvedSettings.showSearch && (
        <div className="relative">
          <Search className="s-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={currentPlaceholder}
            className={searchEl.className}
            style={searchEl.style}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="s-muted absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:text-[var(--site-fg)]"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Provider tabs (only if multiple sources are allowed) */}
      {allowedSources.length > 1 && (
        <div className="s-surface s-border flex items-center gap-1 rounded-lg border p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveSourceFilter('all')}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-center transition',
              activeSourceFilter === 'all'
                ? 'bg-[var(--site-bg)] font-semibold text-[var(--site-fg)] shadow-sm'
                : 's-muted hover:text-[var(--site-fg)]',
              filterEl.className
            )}
            style={filterEl.style}
          >
            All
          </button>
          {allowedSources.includes('youtube') && (
            <button
              type="button"
              onClick={() => setActiveSourceFilter('youtube')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-center transition',
                activeSourceFilter === 'youtube'
                  ? 'bg-[var(--site-bg)] font-semibold text-red-500 shadow-sm'
                  : 's-muted hover:text-red-500',
                filterEl.className
              )}
              style={filterEl.style}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              YouTube
            </button>
          )}
          {allowedSources.includes('vimeo') && (
            <button
              type="button"
              onClick={() => setActiveSourceFilter('vimeo')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-center transition',
                activeSourceFilter === 'vimeo'
                  ? 'bg-[var(--site-bg)] font-semibold text-sky-500 shadow-sm'
                  : 's-muted hover:text-sky-500',
                filterEl.className
              )}
              style={filterEl.style}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Vimeo
            </button>
          )}
          {allowedSources.includes('direct') && (
            <button
              type="button"
              onClick={() => setActiveSourceFilter('direct')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-center transition',
                activeSourceFilter === 'direct'
                  ? 'bg-[var(--site-bg)] font-semibold text-violet-500 shadow-sm'
                  : 's-muted hover:text-violet-500',
                filterEl.className
              )}
              style={filterEl.style}
            >
              Direct
            </button>
          )}
        </div>
      )}
    </div>
  );

  const videoList = (
    <div className="flex flex-col">
      {searchControls}

      {filtered.length === 0 ? (
        <div className="s-border rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">No videos found</p>
          <p className="s-muted mt-1 text-xs">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different keyword.`
              : 'No videos available under this category.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="s-primary-text mt-3 text-xs font-medium hover:underline"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <ul className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
          {filtered.map(video => {
            const isSelected = (selected?.id ?? null) === video.id;
            return (
              <li key={video.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(video.id)}
                  className={cn(
                    'group flex w-full items-start gap-3 rounded-lg border p-2 text-left transition',
                    isSelected
                      ? 's-soft-primary border-[var(--site-primary)] shadow-sm'
                      : 's-border bg-[var(--site-bg)] hover:bg-[var(--site-surface)]',
                    listItemEl.className
                  )}
                  style={listItemEl.style}
                >
                  <div className="s-surface relative h-16 w-28 shrink-0 overflow-hidden rounded-md">
                    {resolvedSettings.thumbnails && video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className={thumbEl.className}
                        style={thumbEl.style}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Play className="s-muted h-5 w-5" />
                      </div>
                    )}
                    {video.duration ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
                        {formatDuration(video.duration)}
                      </span>
                    ) : null}
                  </div>

                  <span className="min-w-0 flex-1">
                    <span
                      className={listTitleEl.className}
                      style={listTitleEl.style}
                    >
                      {video.title}
                    </span>
                    <span className="s-muted mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                          video.provider === 'youtube'
                            ? 'bg-red-500/10 text-red-500'
                            : video.provider === 'vimeo'
                              ? 'bg-sky-500/10 text-sky-500'
                              : 'bg-violet-500/10 text-violet-500',
                          badgeEl.className
                        )}
                        style={badgeEl.style}
                      >
                        {video.provider}
                      </span>
                      {video.completed ? (
                        <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                          Watched
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const isSidebar = resolvedSettings.layout === 'sidebar';
  const isGrid = resolvedSettings.layout === 'grid';
  const gridPlayerRef = useRef<HTMLDivElement>(null);
  const gridColumns = columns ?? settings?.columns ?? 3;
  const popupId = overlayId ?? settings?.overlayId ?? null;

  return (
    <Section section={section} editing={editing}>
      <div className="w-full">
        {/* Preview indicator banner when in builder */}
        {isDemo && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-3.5 py-2 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
            <span>
              <strong>Builder Preview:</strong> Showing sample videos. Real
              videos will be fetched from your site's video library on publish.
            </span>
            <span className="rounded bg-indigo-200/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-indigo-900/60">
              Preview
            </span>
          </div>
        )}

        {(resolvedSettings.title || resolvedSettings.description) && (
          <div className="mb-5">
            {resolvedSettings.title && (
              <h2 className={titleEl.className} style={titleEl.style}>
                {resolvedSettings.title}
              </h2>
            )}
            {resolvedSettings.description && (
              <p className={descEl.className} style={descEl.style}>
                {resolvedSettings.description}
              </p>
            )}
          </div>
        )}

        {isGrid ? (
          <div className="flex flex-col gap-6">
            {searchControls}
            {!popupId && selected && (
              <div ref={gridPlayerRef} className="w-full scroll-mt-24">
                {player}
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="s-border rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No videos found</p>
                <p className="s-muted mt-1 text-xs">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try a different keyword.`
                    : 'No videos available under this category.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="s-primary-text mt-3 text-xs font-medium hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div
                data-overlay-group=""
                className={cn(
                  'grid grid-cols-1 sm:grid-cols-2 gap-6',
                  gridColumns === 2
                    ? 'lg:grid-cols-2'
                    : gridColumns === 4
                      ? 'lg:grid-cols-4'
                      : 'lg:grid-cols-3'
                )}
              >
                {filtered.map(video => {
                  const cardContent = (
                    <div className="s-border s-surface group/card flex h-full flex-col overflow-hidden rounded-lg border transition hover:shadow-md">
                      <div className="relative aspect-video w-full overflow-hidden bg-black/10 dark:bg-white/10">
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className="s-muted size-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover/card:bg-black/40">
                          <div className="flex size-11 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition group-hover/card:scale-110 group-hover/card:bg-black/80">
                            <Play className="size-5 translate-x-0.5 fill-current" />
                          </div>
                        </div>
                        {video.duration ? (
                          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                            {formatDuration(video.duration)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col p-3.5">
                        <h3 className="line-clamp-2 text-sm font-semibold group-hover/card:text-[var(--site-primary)]">
                          {video.title}
                        </h3>
                        <div className="s-muted mt-auto pt-2 flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                              video.provider === 'youtube'
                                ? 'bg-red-500/10 text-red-500'
                                : video.provider === 'vimeo'
                                  ? 'bg-sky-500/10 text-sky-500'
                                  : 'bg-violet-500/10 text-violet-500',
                              badgeEl.className
                            )}
                            style={badgeEl.style}
                          >
                            {video.provider}
                          </span>
                          {video.completed ? (
                            <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                              Watched
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div key={video.id} className="min-w-0">
                      {popupId ? (
                        <OverlayTrigger
                          overlayId={popupId}
                          aria-label={`Play ${video.title}`}
                          lightbox={{
                            video: video.url,
                            poster: video.thumbnailUrl,
                            videoId: video.id,
                            caption: video.title,
                          }}
                          className={GRID_CARD_CLASS}
                        >
                          {cardContent}
                        </OverlayTrigger>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(video.id);
                            // The player sits above the grid, which may be off screen.
                            requestAnimationFrame(() =>
                              gridPlayerRef.current?.scrollIntoView({
                                block: 'nearest',
                                behavior: 'smooth',
                              })
                            );
                          }}
                          aria-label={`Play ${video.title}`}
                          className={cn(GRID_CARD_CLASS, 'w-full')}
                        >
                          {cardContent}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'w-full',
              isSidebar
                ? 'flex flex-col gap-6 lg:flex-row lg:items-start'
                : 'flex flex-col gap-6'
            )}
          >
            {isSidebar ? (
              <>
                <div className="min-w-0 flex-1">{player}</div>
                <aside className="w-full shrink-0 lg:w-80">{videoList}</aside>
              </>
            ) : (
              <>
                <div className="shrink-0">{videoList}</div>
                {player}
              </>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

export default VideoLibrary;
