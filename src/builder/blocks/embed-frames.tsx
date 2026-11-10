import type { CSSProperties } from 'react';
import { Play } from 'lucide-react';
import { EmbedConsentGate } from '@/components/site/embed-consent-gate';
import { parseEmbedInput, parseVideoUrl } from '@/config/post-types';
import { cn } from '@/lib/utils/cn';
import { OverlayTrigger } from './overlay-trigger';

export function VideoContentFrame({
  url,
  posterUrl,
  popupTrigger,
  overlayId,
  editing,
  emptyMessage,
  frameClassName = 's-radius aspect-video h-full w-full rounded',
  frameStyle,
}: {
  url: string;
  posterUrl?: string;
  popupTrigger?: boolean;
  overlayId?: string;
  editing?: boolean;
  emptyMessage?: string;
  frameClassName?: string;
  frameStyle?: CSSProperties;
}) {
  const cleanUrl = url.trim();
  const source = cleanUrl ? parseVideoUrl(cleanUrl) : null;

  if (popupTrigger && overlayId) {
    return (
      <OverlayTrigger
        overlayId={overlayId}
        aria-label="Play video"
        lightbox={{
          video: cleanUrl || undefined,
          poster: posterUrl,
        }}
        className="group/video relative block aspect-video w-full overflow-hidden rounded"
      >
        <div
          className={cn(
            frameClassName,
            'relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/10 dark:bg-white/10'
          )}
          style={frameStyle}
        >
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover/video:scale-105"
            />
          ) : null}
          <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-xs transition duration-200 group-hover/video:scale-110 group-hover/video:bg-black/80">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </div>
        </div>
      </OverlayTrigger>
    );
  }

  if (!source) {
    return editing ? (
      <div className="s-surface s-border s-muted s-radius flex aspect-video items-center justify-center border border-dashed text-sm">
        {emptyMessage ??
          (popupTrigger
            ? 'Choose a popup or drawer in the sidebar'
            : 'Add a video URL in the sidebar')}
      </div>
    ) : null;
  }

  if (source.kind === 'youtube') {
    return (
      <EmbedConsentGate provider="YouTube video" editing={editing}>
        <div className="aspect-video w-full">
          <iframe
            className={frameClassName}
            style={frameStyle}
            src={source.src}
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </EmbedConsentGate>
    );
  }

  if (source.kind === 'vimeo') {
    return (
      <EmbedConsentGate provider="Vimeo video" editing={editing}>
        <iframe
          className={frameClassName}
          style={frameStyle}
          src={source.src}
          title="Video player"
          allow="autoplay"
          allowFullScreen
        />
      </EmbedConsentGate>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      src={source.src}
      className={frameClassName}
      style={frameStyle}
    />
  );
}

function embedProviderLabel(host: string | null): string {
  if (!host) return 'Third-party embed';
  if (host.includes('youtube') || host === 'youtu.be') return 'YouTube video';
  if (host.includes('vimeo')) return 'Vimeo video';
  if (host.includes('google')) return 'Google Maps embed';
  if (host.includes('openstreetmap')) return 'OpenStreetMap embed';
  return `${host} embed`;
}

export function EmbedContentFrame({
  url,
  editing,
  emptyMessage,
  frameClassName = 's-radius aspect-video h-full w-full rounded',
  frameStyle,
}: {
  url: string;
  editing?: boolean;
  emptyMessage?: string;
  frameClassName?: string;
  frameStyle?: CSSProperties;
}) {
  const cleanUrl = url.trim();
  const parsed = cleanUrl ? parseEmbedInput(cleanUrl) : null;

  if (!parsed) {
    return editing ? (
      <div className="s-surface s-border s-muted s-radius flex aspect-video items-center justify-center border border-dashed text-sm">
        {emptyMessage ?? 'Add an <iframe src="..."> snippet or URL in the sidebar'}
      </div>
    ) : null;
  }

  return (
    <EmbedConsentGate
      provider={embedProviderLabel(parsed.host)}
      title={parsed.title ?? parsed.src}
      editing={editing}
    >
      <iframe
        className={frameClassName}
        style={frameStyle}
        src={parsed.src}
        title={parsed.title ?? 'Embedded content'}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </EmbedConsentGate>
  );
}
