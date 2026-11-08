'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { el, type ElementStyle } from './element';

/** Copies `text` to the clipboard; used by the Code block. */
export function CopyButtonClient({
  text,
  elements,
}: {
  text: string;
  elements?: Record<string, ElementStyle>;
}) {
  const [copied, setCopied] = useState(false);
  const btnEl = el({ elements }, 'copyButton', 's-icon-btn size-8');

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard blocked
        }
      }}
      className={btnEl.className}
      style={btnEl.style}
      aria-label={copied ? 'Copied' : 'Copy code'}
      title={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
