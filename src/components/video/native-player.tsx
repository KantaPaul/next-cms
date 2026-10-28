'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { type VideoSettings } from '@/db/schemas/video.schema';
import { clampProgress } from '@/lib/video/progress';

/**
 * NativePlayer — native <video> controls for direct MP4/WebM files.
 *
 * Features:
 * - Standard native controls (play, pause, seek, volume, fullscreen, download)
 * - Seek lock: when enabled, seeking is clamped so viewers can't skip ahead
 * beyond the watched portion (applies to native playback only)
 * - Progress tracking: reports position/duration/completion via onProgress
 * - Poster support via thumbnailUrl
 */
export type NativePlayerProps = {
  src: string;
  poster?: string | null;
  duration?: number | null;
  /** When true, viewers cannot seek beyond the watched position. */
  lockSeek?: boolean;
  /** Whether download button should be shown (native only). */
  allowDownload?: boolean;
  /** Resume position in seconds (from saved progress). */
  startPosition?: number | null;
  onProgress?: (progress: { position: number; duration: number | null; completed: boolean }) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
};

export function NativePlayer({
  src,
  poster,
  duration,
  lockSeek = false,
  allowDownload = true,
  startPosition,
  onProgress,
  onPlay,
  onPause,
  onEnded,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastPositionRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
    if (!progressTimerRef.current) {
      progressTimerRef.current = setInterval(() => {
        const el = videoRef.current;
        if (!el) return;
        const clamped = clampProgress(el.currentTime, el.duration ?? duration ?? null);
        lastPositionRef.current = clamped.position;
        onProgress?.({
          position: clamped.position,
          duration: clamped.duration,
          completed: clamped.completed,
        });
      }, 1000);
    }
  }, [duration, onPlay, onProgress]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
    onPause?.();
  }, [clearTimer, onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
    onEnded?.();
  }, [clearTimer, onEnded]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLVideoElement>) => {
      const el = videoRef.current;
      if (!el) return;
      const requested = e.currentTarget.currentTime;
      const maxAllowed = lockSeek ? lastPositionRef.current : el.duration ?? requested;
      if (requested > maxAllowed) {
        // Clamp seek back to the allowed position
        el.currentTime = maxAllowed;
        setIsSeeking(true);
        setTimeout(() => setIsSeeking(false), 150);
      } else {
        lastPositionRef.current = requested;
      }
    },
    [lockSeek]
  );

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || isSeeking) return;
    const clamped = clampProgress(el.currentTime, el.duration ?? duration ?? null);
    lastPositionRef.current = clamped.position;
    if (!isPlaying && !el.paused) {
      setIsPlaying(true);
    }
  }, [duration, isPlaying, isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    lastPositionRef.current = 0;
  }, []);

  const handleCanPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    // Resume to the saved position if we have one
    if (startPosition && startPosition > 0) {
      el.currentTime = startPosition;
    }
    lastPositionRef.current = startPosition && startPosition > 0 ? startPosition : 0;
  }, [startPosition]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full"
        src={src}
        poster={poster ?? undefined}
        controls
        preload="metadata"
        disablePictureInPicture={!allowDownload}
        disableRemotePlayback={!allowDownload}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onSeeked={handleSeek}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
      />
      {lockSeek && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1 rounded bg-black/60 text-white text-xs font-medium">
            Seek locked
          </span>
        </div>
      )}
    </div>
  );
}

export default NativePlayer;
