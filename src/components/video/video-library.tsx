'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { parseVideoUrl } from '@/lib/video/parse';
import type { ParsedVideo } from '@/lib/video/parse';
import { saveVideoProgress } from '@/app/(admin)/dashboard/(shell)/videos/_modules/videos.actions';
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
};

export type VideoLibraryProps = {
  videos?: VideoLibraryVideoItem[];
  settings?: Partial<VideoLibrarySettings> | null;
  title?: string;
  description?: string;
  layout?: 'sidebar' | 'stacked';
  defaultPlaylistId?: string | null;
  /** Block-level playlist override. */
  playlistId?: string | null;
  editing?: boolean;
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
  defaultPlaylistId = null,
  playlistId = null,
  editing = false,
  onProgress,
}: VideoLibraryProps) {
  const items = useMemo(() => videos ?? [], [videos]);
  const resolvedSettings: VideoLibrarySettings = {
    enabled: settings?.enabled ?? true,
    title: settings?.title ?? title ?? 'Videos',
    description: settings?.description ?? description ?? '',
    layout: settings?.layout ?? layout ?? 'sidebar',
    defaultPlaylistId: settings?.defaultPlaylistId ?? defaultPlaylistId ?? null,
    thumbnails: settings?.thumbnails ?? true,
    descriptions: settings?.descriptions ?? true,
    pageSize: settings?.pageSize ?? 12,
    providers: settings?.providers ?? { youtube: true, vimeo: true, direct: true },
    progress: settings?.progress ?? true,
    resume: settings?.resume ?? true,
    completionPercent: settings?.completionPercent ?? 0.9,
  };

  const visible = useMemo(() => {
    const scoped = playlistId
      ? items.filter(v => v.playlistId === playlistId)
      : items;
    const finalList = resolvedSettings.defaultPlaylistId
      ? scoped.filter(v => v.playlistId === resolvedSettings.defaultPlaylistId)
      : scoped;
    const limited =
      resolvedSettings.pageSize > 0
        ? finalList.slice(0, resolvedSettings.pageSize)
        : finalList;
    return limited;
  }, [items, playlistId, resolvedSettings]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    visible.find(v => v.id === selectedId) ??
    visible.find(v => v.id === resolvedSettings.defaultPlaylistId) ??
    visible[0] ??
    null;

  useEffect(() => {
    if (!selected && visible.length > 0) {
      setSelectedId(visible[0].id);
    }
    if (selected && !visible.some(v => v.id === selected.id)) {
      setSelectedId(visible[0]?.id ?? null);
    }
  }, [visible, selected]);

  const handleProgress = useCallback(
    (p: { position: number; duration: number | null; completed: boolean }) => {
      if (!selected || !resolvedSettings.progress) return;
      onProgress?.({
        videoId: selected.id,
        position: p.position,
        duration: p.duration,
        completed: p.completed,
      });
    },
    [selected, resolvedSettings.progress, onProgress]
  );

  const handleEnded = useCallback(() => {
    if (!selected || !resolvedSettings.progress) return;
    onProgress?.({
      videoId: selected.id,
      position: selected.duration ?? 0,
      duration: selected.duration,
      completed: true,
    });
  }, [selected, resolvedSettings.progress, onProgress]);

  if (editing) {
    return (
      <div className="s-surface s-border s-muted s-radius rounded-lg border border-dashed p-6 text-sm">
        The video library block renders the published video library here. Add a
        supported video URL, publish it, then place this block.
      </div>
    );
  }

  if (!resolvedSettings.enabled) return null;
  if (visible.length === 0) return null;

  const parsed: ParsedVideo | null = selected ? parseVideoUrl(selected.url) : null;
  const unavailable =
    !!selected && resolvedSettings.providers?.[selected.provider] === false;

  const player = selected ? (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {unavailable || !parsed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-steel-100 dark:bg-dark-200 px-6 text-center">
          <p className="text-sm text-steel-700 dark:text-steel-300">
            This video is unavailable right now.
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
  ) : null;

  const list = (
    <ul className="flex flex-col gap-3">
      {visible.map(video => (
        <li key={video.id}>
          <button
            type="button"
            onClick={() => setSelectedId(video.id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border p-2 text-left transition',
              (selected?.id ?? null) === video.id
                ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40'
                : 'border-transparent bg-transparent hover:bg-steel-100 dark:hover:bg-dark-200'
            )}
          >
            {resolvedSettings.thumbnails && video.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnailUrl}
                alt=""
                className="h-16 w-28 rounded object-cover"
              />
            ) : (
              <div className="h-16 w-28 rounded bg-steel-100 dark:bg-dark-200" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{video.title}</span>
              {video.duration ? (
                <span className="mt-1 block text-xs text-steel-500">
                  {formatDuration(video.duration)}
                </span>
              ) : null}
              {video.completed ? (
                <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Completed
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const isSidebar = resolvedSettings.layout === 'sidebar';

  return (
    <section
      className={cn(
        'w-full',
        isSidebar
          ? 'flex flex-col lg:flex-row lg:items-start gap-6'
          : 'flex flex-col gap-6'
      )}
    >
      {isSidebar ? (
        <>
          {player}
          <aside className="w-full lg:w-80 shrink-0">{list}</aside>
        </>
      ) : (
        <>
          <div className="shrink-0">{list}</div>
          {player}
        </>
      )}
    </section>
  );
}

export default VideoLibrary;
