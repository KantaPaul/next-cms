'use client';

import { ShieldAlert } from 'lucide-react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useConsent } from './consent-provider';

export function ConsentEmbedPlaceholder({
  provider,
  title,
  className,
  style,
  onLoadOnce,
  onAlwaysAllow,
}: {
  provider: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  onLoadOnce: () => void;
  onAlwaysAllow: () => void;
}) {
  return (
    <div
      data-consent-placeholder={provider}
      className={cn(
        's-surface s-border s-radius flex aspect-video w-full flex-col items-center justify-center border p-5 text-center',
        className
      )}
      style={style}
    >
      <ShieldAlert className="s-muted mb-2 size-6" aria-hidden />
      <p className="text-sm font-semibold">{provider}</p>
      {title && (
        <p className="s-muted mt-0.5 line-clamp-1 max-w-md text-xs">{title}</p>
      )}
      <p className="s-muted mt-2 max-w-sm text-xs">
        External content is blocked until you consent to marketing cookies.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onLoadOnce}
          className="s-btn-secondary s-radius px-3 py-1.5 text-xs font-medium"
        >
          Load
        </button>
        <button
          type="button"
          onClick={onAlwaysAllow}
          className="s-btn-primary s-radius px-3 py-1.5 text-xs font-medium"
        >
          Always allow
        </button>
      </div>
    </div>
  );
}

/**
 * Click-to-load consent gate for third-party embeds (YouTube, Vimeo, Maps, etc.).
 * In editor mode (`editing=true`), renders children directly without gating.
 */
export function EmbedConsentGate({
  provider,
  title,
  editing,
  className,
  style,
  children,
}: {
  provider: string;
  title?: string;
  editing?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { hasConsent, acceptCategory } = useConsent();
  const [loadedOnce, setLoadedOnce] = useState(false);

  const allowed = Boolean(editing) || hasConsent('marketing') || loadedOnce;

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <ConsentEmbedPlaceholder
      provider={provider}
      title={title}
      className={className}
      style={style}
      onLoadOnce={() => setLoadedOnce(true)}
      onAlwaysAllow={() => void acceptCategory('marketing')}
    />
  );
}
