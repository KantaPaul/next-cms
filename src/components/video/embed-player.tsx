'use client';

import { useEffect, useState } from 'react';
import { useConsent } from '@/components/site/consent-provider';
import { ConsentEmbedPlaceholder } from '@/components/site/embed-consent-gate';
import type { EmbedResult } from '@/lib/video/embed';

/**
 * EmbedPlayer — YouTube/Vimeo iframe player with unavailable fallback
 * and marketing cookie consent gating.
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
  editing?: boolean;
  onUnavailable?: () => void;
};

export function EmbedPlayer({
  embed,
  thumbnailUrl,
  width,
  height,
  start = null,
  title,
  editing = false,
  onUnavailable,
}: EmbedPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const { hasConsent, acceptCategory } = useConsent();

  // Mount the iframe on the client only: a server-rendered iframe can finish
  // loading before hydration, so React never sees `load` and the overlay sticks.
  useEffect(() => setMounted(true), []);

  // Reset states when the embed src changes (e.g. user selects a different video)
  useEffect(() => {
    setIsLoaded(false);
    setIsUnavailable(false);
    setLoadedOnce(false);
  }, [embed?.src]);

  const resolvedSrc =
    embed && start && start > 0
      ? `${embed.src}${embed.src.includes('?') ? '&' : '?'}start=${Math.floor(start)}`
      : embed?.src;

  const hasCustomDimensions = width !== undefined || height !== undefined;
  const containerStyle = hasCustomDimensions ? { width, height } : undefined;

  if (!embed) {
    return (
      <div
        className="relative flex aspect-video h-full w-full items-center justify-center rounded-lg bg-neutral-900"
        style={containerStyle}
      >
        <p className="text-sm text-neutral-400">Unsupported video provider</p>
      </div>
    );
  }

  const canLoad = editing || hasConsent('marketing') || loadedOnce;
  if (!canLoad) {
    const providerLabel =
      embed.provider === 'youtube' ? 'YouTube video' : 'Vimeo video';
    return (
      <ConsentEmbedPlaceholder
        provider={providerLabel}
        title={title}
        style={containerStyle}
        onLoadOnce={() => setLoadedOnce(true)}
        onAlwaysAllow={() => void acceptCategory('marketing')}
      />
    );
  }

  if (isUnavailable) {
    return (
      <div
        className="relative flex aspect-video h-full w-full items-center justify-center rounded-lg bg-neutral-900"
        style={containerStyle}
      >
        <div className="p-4 text-center">
          <p className="text-sm font-medium text-neutral-200">
            Video unavailable
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Embedding is not allowed for this video.
          </p>
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="mx-auto mt-3 max-h-48 max-w-full rounded opacity-50"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video h-full w-full overflow-hidden rounded-lg bg-black"
      style={containerStyle}
    >
      {!isLoaded && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black">
          <div className="text-sm text-neutral-400">Loading…</div>
        </div>
      )}
      {mounted && (
        <iframe
          key={resolvedSrc}
          src={resolvedSrc ?? undefined}
          width={width ?? '100%'}
          height={height ?? '100%'}
          className="h-full w-full border-0"
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
      )}
    </div>
  );
}

export default EmbedPlayer;
