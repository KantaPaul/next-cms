'use client';

import { Check, Link2, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export type ShareNetwork = 'copy' | 'x' | 'linkedin' | 'facebook' | 'email';

const LABEL: Record<ShareNetwork, string> = {
  copy: 'Copy link',
  x: 'Share on X',
  linkedin: 'Share on LinkedIn',
  facebook: 'Share on Facebook',
  email: 'Share by email',
};

function shareHref(network: ShareNetwork, url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (network) {
    case 'x':
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'email':
      return `mailto:?subject=${t}&body=${u}`;
    default:
      return url;
  }
}

/** Brand glyphs as text so no third-party icon set is needed. */
function Glyph({ network }: { network: ShareNetwork }) {
  if (network === 'copy') return <Link2 className="size-4" aria-hidden />;
  if (network === 'email') return <Mail className="size-4" aria-hidden />;
  const text = { x: '𝕏', linkedin: 'in', facebook: 'f' }[network];
  return (
    <span aria-hidden className="text-[13px] font-bold leading-none">
      {text}
    </span>
  );
}

export function ShareButtonsClient({
  networks,
  title,
  label,
  align = 'left',
}: {
  networks: ShareNetwork[];
  title: string;
  label?: string;
  align?: 'left' | 'center';
}) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href.split('#')[0]);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing to do
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        align === 'center' && 'justify-center'
      )}
    >
      {label ? (
        <span className="s-meta mr-1 font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
      ) : null}
      {networks.map(network =>
        network === 'copy' ? (
          <button
            key={network}
            type="button"
            onClick={copy}
            className="s-icon-btn s-border border"
            aria-label={copied ? 'Link copied' : LABEL.copy}
            title={copied ? 'Link copied' : LABEL.copy}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Glyph network="copy" />}
          </button>
        ) : (
          <a
            key={network}
            href={url ? shareHref(network, url, title) : '#'}
            target={network === 'email' ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="s-icon-btn s-border border"
            aria-label={LABEL[network]}
            title={LABEL[network]}
          >
            <Glyph network={network} />
          </a>
        )
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Link copied' : ''}
      </span>
    </div>
  );
}
