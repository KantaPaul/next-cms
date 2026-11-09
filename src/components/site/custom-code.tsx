'use client';

import { useEffect } from 'react';

type Slot = 'head' | 'bodyStart' | 'bodyEnd';

/**
 * Adds the admin's custom head/body code to the page once per full load.
 * HTML set with `dangerouslySetInnerHTML` never runs its `<script>` tags, so
 * analytics and pixel snippets need a parsed fragment, which does run them.
 */
export function CustomCode({ html, slot }: { html: string; slot: Slot }) {
  useEffect(() => {
    if (!html.trim()) return;
    const marker = `data-custom-code-${slot}`;
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
  }, [html, slot]);
  return null;
}
