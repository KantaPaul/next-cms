'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Play, X, ExternalLink, Video as VideoIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { parseVideoUrl } from '@/lib/video/parse';
import type { ParsedVideo } from '@/lib/video/parse';
import { saveVideoProgress } from '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions';
import { Section, type SectionSettings } from '@/builder/blocks/section';
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
  layout: 'sidebar' | 'stacked';
  defaultPlaylistId: string | null;
  thumbnails: boolean;
  descriptions: boolean;
  pageSize: number;
  providers: Record<string, boolean>;
  progress: boolean;
  resume: boolean;
  completionPercent: number;
  source?: 'all' | 'youtube' | 'vimeo' | 'direct' | ('youtube' | 'vimeo' | 'direct')[];
  sources?: ('youtube' | 'vimeo' | 'direct')[];
  showSearch?: boolean;
  searchPlaceholder?: string;
};

export type VideoLibraryProps = {
  videos?: VideoLibraryVideoItem[];
  settings?: Partial<VideoLibrarySettings> | null;
  title?: string;
  description?: string;
  layout?: 'sidebar' | 'stacked';
  source?: 'all' | 'youtube' | 'vimeo' | 'direct' | ('youtube' | 'vimeo' | 'direct')[];
  sources?: ('youtube' | 'vimeo' | 'direct')[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  defaultPlaylistId?: string | null;
  /** Block-level playlist override. */
  playlistId?: string | null;
  editing?: boolean;
  section?: SectionSettings;
  /** Reports playback position / completion while the viewer plays. */
  onProgress?: (progress: {
    videoId: string;
    position: number;
    duration: number | null;
    completed: boolean;
  }) => void | Promise<void>;
};

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
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&q=80',
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
export function VideoLibraryBlock(props: Omit<VideoLibraryProps, 'onProgress'>) {
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
  source = 'all',
  sources,
  showSearch = true,
  searchPlaceholder,
  defaultPlaylistId = null,
  playlistId = null,
  editing = false,
  section,
  onProgress,
}: VideoLibraryProps) {
  const allowedSources = useMemo<('youtube' | 'vimeo' | 'direct')[]>(() => {
    if (Array.isArray(sources) && sources.length > 0) return sources;
    if (Array.isArray(settings?.sources) && settings.sources.length > 0) return settings.sources;
    if (Array.isArray(source) && source.length > 0) return source as ('youtube' | 'vimeo' | 'direct')[];
    if (typeof source === 'string' && source !== 'all') return [source as 'youtube' | 'vimeo' | 'direct'];
    if (typeof settings?.source === 'string' && settings.source !== 'all') {
      return [settings.source as 'youtube' | 'vimeo' | 'direct'];
    }
    return ['youtube', 'vimeo', 'direct'];
  }, [sources, settings?.sources, source, settings?.source]);

  const isDemo = editing && (!videos || videos.length === 0);
  const items = useMemo(() => {
    if (videos && videos.length > 0) return videos;
    if (isDemo) {
      const demoMatches = DEMO_VIDEOS.filter(v => allowedSources.includes(v.provider));
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
    providers: settings?.providers ?? { youtube: true, vimeo: true, direct: true },
    progress: settings?.progress ?? true,
    resume: settings?.resume ?? true,
    completionPercent: settings?.completionPercent ?? 0.9,
  };

  // State for active source tab within the widget (if multiple sources are allowed)
  const [activeSourceFilter, setActiveSourceFilter] = useState<'all' | 'youtube' | 'vimeo' | 'direct'>(
    allowedSources.length === 1 ? allowedSources[0] : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Keep in sync if allowedSources changes in builder inspector
  useEffect(() => {
    if (allowedSources.length === 1) {
      setActiveSourceFilter(allowedSources[0]);
    } else if (activeSourceFilter !== 'all' && !allowedSources.includes(activeSourceFilter)) {
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
    let result = scopedByPlaylist.filter(v => allowedSources.includes(v.provider));

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
  }, [scopedByPlaylist, allowedSources, activeSourceFilter, searchQuery, resolvedSettings.pageSize]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    filtered.find(v => v.id === selectedId) ??
    filtered[0] ??
    items[0] ??
    null;

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
    if (selected && !filtered.some(v => v.id === selected.id) && filtered.length > 0) {
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

  const parsed: ParsedVideo | null = selected ? parseVideoUrl(selected.url) : null;
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

  const player = selected ? (
    <div className="flex flex-col gap-3">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-md ring-1 ring-black/10">
        {unavailable || !parsed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-steel-100 dark:bg-dark-200 px-6 text-center">
            <p className="text-sm text-steel-700 dark:text-steel-300">
              This video is currently unavailable.
            </p>
          </div>
        ) : (
          <VideoPlayer
            parsed={parsed}
            startPosition={resolvedSettings.resume ? selected.position ?? null : null}
            poster={resolvedSettings.thumbnails ? selected.thumbnailUrl : null}
            duration={selected.duration ?? undefined}
            title={selected.title}
            lockSeek={resolvedSettings.progress ? selected.provider === 'direct' : false}
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
            {selected.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-steel-500 mt-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full capitalize',
                selected.provider === 'youtube'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : selected.provider === 'vimeo'
                    ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400'
                    : 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400'
              )}
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              {selected.provider}
            </span>
            {selected.duration ? <span>{formatDuration(selected.duration)}</span> : null}
            {selected.playlistName ? <span>• {selected.playlistName}</span> : null}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-steel-100 dark:bg-dark-200 rounded-xl aspect-video flex flex-col items-center justify-center p-6 text-center">
      <VideoIcon className="h-10 w-10 text-steel-400 mb-2" />
      <p className="text-sm font-medium text-steel-700 dark:text-steel-300">
        No video selected
      </p>
    </div>
  );

  const searchControls = (
    <div className="flex flex-col gap-2.5 mb-3">
      {/* Search Input */}
      {resolvedSettings.showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={currentPlaceholder}
            className="w-full h-9 rounded-lg border border-steel-200 bg-white/90 dark:border-dark-300 dark:bg-dark-100 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-steel-400 hover:text-steel-600 rounded"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Provider tabs (only if multiple sources are allowed) */}
      {allowedSources.length > 1 && (
        <div className="flex items-center gap-1 p-0.5 bg-steel-100 dark:bg-dark-200 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveSourceFilter('all')}
            className={cn(
              'flex-1 py-1 px-2 rounded-md transition text-center',
              activeSourceFilter === 'all'
                ? 'bg-white dark:bg-dark-100 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-steel-600 dark:text-steel-400 hover:text-slate-900'
            )}
          >
            All
          </button>
          {allowedSources.includes('youtube') && (
            <button
              type="button"
              onClick={() => setActiveSourceFilter('youtube')}
              className={cn(
                'flex-1 py-1 px-2 rounded-md transition text-center flex items-center justify-center gap-1',
                activeSourceFilter === 'youtube'
                  ? 'bg-white dark:bg-dark-100 text-red-600 dark:text-red-400 shadow-sm font-semibold'
                  : 'text-steel-600 dark:text-steel-400 hover:text-red-600'
              )}
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
                'flex-1 py-1 px-2 rounded-md transition text-center flex items-center justify-center gap-1',
                activeSourceFilter === 'vimeo'
                  ? 'bg-white dark:bg-dark-100 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                  : 'text-steel-600 dark:text-steel-400 hover:text-sky-600'
              )}
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
                'flex-1 py-1 px-2 rounded-md transition text-center flex items-center justify-center gap-1',
                activeSourceFilter === 'direct'
                  ? 'bg-white dark:bg-dark-100 text-violet-600 dark:text-violet-400 shadow-sm font-semibold'
                  : 'text-steel-600 dark:text-steel-400 hover:text-violet-600'
              )}
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
        <div className="rounded-lg border border-dashed border-steel-200 dark:border-dark-300 p-6 text-center">
          <p className="text-sm font-medium text-steel-700 dark:text-steel-300">
            No videos found
          </p>
          <p className="text-xs text-steel-500 mt-1">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different keyword.`
              : 'No videos available under this category.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-indigo-600 hover:underline font-medium"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
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
                      ? 'border-indigo-400 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-steel-100 bg-white/50 hover:bg-steel-50 dark:border-dark-300/60 dark:bg-dark-100/40 dark:hover:bg-dark-200/80'
                  )}
                >
                  <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-steel-200 dark:bg-dark-200">
                    {resolvedSettings.thumbnails && video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Play className="h-5 w-5 text-steel-400" />
                      </div>
                    )}
                    {video.duration ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
                        {formatDuration(video.duration)}
                      </span>
                    ) : null}
                  </div>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                      {video.title}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-steel-500">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase',
                          video.provider === 'youtube'
                            ? 'text-red-600 bg-red-50 dark:bg-red-950/50'
                            : video.provider === 'vimeo'
                              ? 'text-sky-600 bg-sky-50 dark:bg-sky-950/50'
                              : 'text-violet-600 bg-violet-50 dark:bg-violet-950/50'
                        )}
                      >
                        {video.provider}
                      </span>
                      {video.completed ? (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.2 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Watched
                        </span>
                      ) : null}
                    </div>
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

  return (
    <Section section={section} editing={editing}>
      <div className="w-full">
        {/* Preview indicator banner when in builder */}
        {isDemo && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-100 px-3.5 py-2 text-xs text-indigo-800 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-300">
            <span>
              <strong>Builder Preview:</strong> Showing sample videos. Real videos will be fetched from your site's video library on publish.
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-200/60 dark:bg-indigo-900/60 rounded">
              Preview
            </span>
          </div>
        )}

        {(resolvedSettings.title || resolvedSettings.description) && (
          <div className="mb-5">
            {resolvedSettings.title && (
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {resolvedSettings.title}
              </h2>
            )}
            {resolvedSettings.description && (
              <p className="mt-1 text-sm text-steel-500">
                {resolvedSettings.description}
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            'w-full',
            isSidebar
              ? 'flex flex-col lg:flex-row lg:items-start gap-6'
              : 'flex flex-col gap-6'
          )}
        >
          {isSidebar ? (
            <>
              <div className="flex-1 min-w-0">{player}</div>
              <aside className="w-full lg:w-80 shrink-0">{videoList}</aside>
            </>
          ) : (
            <>
              <div className="shrink-0">{videoList}</div>
              {player}
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

export default VideoLibrary;