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
  width?: number;
  height?: number;
  onUnavailable?: () => void;
};

export function EmbedPlayer({
  embed,
  thumbnailUrl,
  width = 640,
  height = 360,
  onUnavailable,
}: EmbedPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

    // YouTube/Vimeo can take a moment; treat no load after 10s as unavailable
    const timer = setTimeout(() => {
      if (!isLoaded && !isUnavailable) {
        setIsUnavailable(true);
        onUnavailable?.();
      }
    }, 10000);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(timer);
    };
  }, [isLoaded, isUnavailable, onUnavailable]);

  if (isUnavailable) {
    return (
      <div
        className="relative bg-steel-100 rounded-lg aspect-video flex items-center justify-center dark:bg-dark-200"
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="text-sm font-medium text-steel-700 dark:text-steel-300">
            Video unavailable
          </p>
          <p className="text-xs text-steel-500 dark:text-steel-400 mt-1">
            Embedding is not allowed for this video.
          </p>
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="mt-3 rounded max-w-full max-h-48 opacity-50"
            />
          )}
        </div>
      </div>
    );
  }

  if (!embed || !isLoaded) {
    return (
      <div
        className="relative bg-black rounded-lg aspect-video flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-sm text-steel-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video" style={{ width, height }}>
      <iframe
        ref={iframeRef}
        src={embed.src}
        width={width}
        height={height}
        className="w-full h-full"
        title={`${embed.provider} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export default EmbedPlayer;
