/**
 * Breadcrumb of the selected block's ancestors (R718 / UXE-08). Click a crumb
 * to select that parent; the page itself is always the first crumb.
 */

import { ancestorIds } from '@nextcms/builder-core';
import type { CSSProperties } from 'react';
import { useEditor, useEditorStore } from './context';

const crumbStyle: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: 4,
  font: '12px/1.4 system-ui, sans-serif',
};

export function Breadcrumb({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selectedId = useEditor(state =>
    state.selection.length === 1 ? state.selection[0] : null
  );

  if (!selectedId || !doc.nodes[selectedId]) {
    return (
      <nav
        aria-label="Block path"
        style={{
          font: '12px/1.4 system-ui, sans-serif',
          opacity: 0.6,
          ...style,
        }}
      >
        Page
      </nav>
    );
  }

  // Nearest ancestor first; reverse so the page/root reads first, selected block last.
  const chain = [...ancestorIds(doc, selectedId)].reverse();
  const label = (id: string) =>
    doc.nodes[id]?.meta?.name ||
    store.schemas[doc.nodes[id]?.type ?? '']?.label ||
    doc.nodes[id]?.type ||
    id;

  return (
    <nav
      aria-label="Block path"
      style={{ display: 'flex', alignItems: 'center', gap: 2, ...style }}
    >
      <button
        type="button"
        style={crumbStyle}
        onClick={() => store.select(null)}
      >
        Page
      </button>
      {chain.map(id => (
        <span key={id} style={{ display: 'contents' }}>
          <span
            aria-hidden
            style={{ opacity: 0.4, font: '12px/1 system-ui, sans-serif' }}
          >
            /
          </span>
          <button
            type="button"
            style={crumbStyle}
            onClick={() => store.select(id)}
          >
            {label(id)}
          </button>
        </span>
      ))}
      <span
        aria-hidden
        style={{ opacity: 0.4, font: '12px/1 system-ui, sans-serif' }}
      >
        /
      </span>
      <span style={{ ...crumbStyle, fontWeight: 600, cursor: 'default' }}>
        {label(selectedId)}
      </span>
    </nav>
  );
}
