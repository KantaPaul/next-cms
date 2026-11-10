'use client';

import { useEffect } from 'react';
import { useConsent } from '@/components/site/consent-provider';
import type { ConsentCategory } from '@/lib/site-essentials-types';

type Slot = 'head' | 'bodyStart' | 'bodyEnd';

/**
 * Adds the admin's custom head/body code to the page once per full load,
 * waiting for consent on the snippet's assigned category (marketing by default).
 * HTML set with `dangerouslySetInnerHTML` never runs its `<script>` tags, so
 * analytics and pixel snippets need a parsed fragment, which does run them.
 */
export function CustomCode({
  html,
  slot,
  category = 'marketing',
  id,
}: {
  html: string;
  slot: Slot;
  category?: ConsentCategory;
  id?: string;
}) {
  const { hasConsent } = useConsent();
  const allowed = hasConsent(category);

  useEffect(() => {
    if (!allowed || !html.trim()) return;
    const marker = id
      ? `data-custom-code-${slot}-${id}`
      : `data-custom-code-${slot}`;
    if (document.querySelector(`[${marker}]`)) return;
    const range = document.createRange();
    range.selectNode(slot === 'head' ? document.head : document.body);
    const fragment = range.createContextualFragment(html);
    const nodes = Array.from(fragment.childNodes);
    for (const node of nodes) {
      if (node instanceof Element) node.setAttribute(marker, '');
    }
    if (slot === 'head') document.head.append(fragment);
    else if (slot === 'bodyStart') document.body.prepend(fragment);
    else document.body.append(fragment);
  }, [html, slot, allowed]);
  return null;
}
