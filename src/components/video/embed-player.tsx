'use client';

import { useEffect, useRef, useState } from 'react';
import type { EmbedResult } from '@/lib/video/embed';

/**
 * EmbedPlayer — YouTube/Vimeo iframe player with unavailable fallback.
 *
 * Renders an iframe using the allowlisted embed src. If the iframe fails
 * to load (e.g. owner disallows embedding, provider script blocked), an
 * unavailable fallback is shown.
 */
export type EmbedPlayerProps = {
  embed: EmbedResult;
  thumbnailUrl?: string | null;
  width?: number | string;
  height?: number | string;
  /** Resume start position in seconds (from saved progress). */
  start?: number | null;
  /** Accessible title for the iframe. */
  title?: string;
  onUnavailable?: () => void;
};

export function EmbedPlayer({
  embed,
  thumbnailUrl,
  width,
  height,
  start = null,
  title,
  onUnavailable,
}: EmbedPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset states when the embed src changes (e.g. user selects a different video)
  useEffect(() => {
    setIsLoaded(false);
    setIsUnavailable(false);
  }, [embed?.src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => {
      setIsUnavailable(true);
      onUnavailable?.();
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // YouTube/Vimeo can take a moment; treat no load after 12s as unavailable
    const timer = setTimeout(() => {
      if (!isLoaded && !isUnavailable) {
        setIsUnavailable(true);
        onUnavailable?.();
      }
    }, 12000);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(timer);
    };
  }, [embed?.src, isLoaded, isUnavailable, onUnavailable]);

  const resolvedSrc =
    embed && start && start > 0
      ? `${embed.src}${embed.src.includes('?') ? '&' : '?'}start=${Math.floor(start)}`
      : embed?.src;

  const hasCustomDimensions = width !== undefined || height !== undefined;
  const containerStyle = hasCustomDimensions ? { width, height } : undefined;

  if (isUnavailable) {
    return (
      <div
        className="relative w-full h-full bg-steel-100 rounded-lg aspect-video flex items-center justify-center dark:bg-dark-200"
        style={containerStyle}
      >
        <div className="text-center p-4">
          <p className="text-sm font-medium text-steel-700 dark:text-steel-300">
            Video unavailable
          </p>
          <p className="text-xs text-steel-500 dark:text-steel-400 mt-1">
            Embedding is not allowed for this video.
          </p>
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="mt-3 rounded max-w-full max-h-48 opacity-50 mx-auto"
            />
          )}
        </div>
      </div>
    );
  }

  if (!embed) {
    return (
      <div
        className="relative w-full h-full bg-steel-100 rounded-lg aspect-video flex items-center justify-center dark:bg-dark-200"
        style={containerStyle}
      >
        <p className="text-sm text-steel-500">Unsupported video provider</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full bg-black rounded-lg overflow-hidden aspect-video"
      style={containerStyle}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10 pointer-events-none">
          <div className="text-sm text-steel-400">Loading…</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={resolvedSrc ?? undefined}
        width={width ?? '100%'}
        height={height ?? '100%'}
        className="w-full h-full border-0"
        title={title ?? `${embed.provider} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setIsUnavailable(true);
          onUnavailable?.();
        }}
      />
    </div>
  );
}

export default EmbedPlayer;
