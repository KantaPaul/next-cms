'use client';

import { useCallback } from 'react';
import type { ParsedVideo } from '@/lib/video/parse';
import { buildEmbed } from '@/lib/video/embed';
import { clampProgress } from '@/lib/video/progress';
import { NativePlayer } from './native-player';
import { EmbedPlayer } from './embed-player';

export type VideoPlayerProps = {
  parsed: ParsedVideo;
  /** Resume position in seconds (from saved progress). */
  startPosition?: number | null;
  /** Whether seek locking is enabled (native only). */
  lockSeek?: boolean;
  /** Poster/thumbnail URL. */
  poster?: string | null;
  /** Video duration in seconds. */
  duration?: number | null;
  onProgress?: (progress: {
    position: number;
    duration: number | null;
    completed: boolean;
  }) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
};

/**
 * VideoPlayer — renders the appropriate player based on the parsed provider.
 * Direct MP4/WebM -> native <video>. YouTube/Vimeo -> iframe embed.
 */
export function VideoPlayer({
  parsed,
  startPosition,
  lockSeek = false,
  poster,
  duration,
  onProgress,
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const embed = buildEmbed(parsed);

  const handleProgress = useCallback(
    (p: { position: number; duration: number | null; completed: boolean }) => {
      // Clamp progress on the client side as well
      const clamped = clampProgress(p.position, p.duration);
      onProgress?.({
        position: clamped.position,
        duration: clamped.duration,
        completed: clamped.completed,
      });
    },
    [onProgress]
  );

  if (parsed.provider === 'direct') {
    return (
      <NativePlayer
        src={parsed.id}
        poster={poster}
        duration={duration}
        lockSeek={lockSeek}
        allowDownload={true}
        onProgress={handleProgress}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      />
    );
  }

  if (!embed) {
    return (
      <div className="bg-steel-100 rounded-lg aspect-video flex items-center justify-center dark:bg-dark-200">
        <p className="text-sm text-steel-500">
          Unsupported video provider
        </p>
      </div>
    );
  }

  return (
    <EmbedPlayer
      embed={embed}
      thumbnailUrl={poster}
      onUnavailable={() => {
        // Fallback already rendered by EmbedPlayer
      }}
    />
  );
}

export default VideoPlayer;
