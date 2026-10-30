/**
 * Breadcrumb of the selected block's ancestors (R718 / UXE-08). Click a crumb
 * to select that parent; the page itself is always the first crumb. Renders
 * through editor-ui's Breadcrumb (B15 E6).
 */

import { ancestorIds } from '@nextcms/builder-core';
import {
  Breadcrumb as BreadcrumbView,
  type BreadcrumbItem,
} from '@nextcms/editor-ui';
import type { CSSProperties } from 'react';
import { useEditor, useEditorStore } from './context';

export function Breadcrumb({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selectedId = useEditor(state =>
    state.selection.length === 1 ? state.selection[0] : null
  );
  const label = (id: string) =>
    doc.nodes[id]?.meta?.name ||
    store.schemas[doc.nodes[id]?.type ?? '']?.label ||
    doc.nodes[id]?.type ||
    id;

  const selected = selectedId && doc.nodes[selectedId] ? selectedId : null;
  const items: BreadcrumbItem[] = selected
    ? [
        { id: 'page', label: 'Page', onSelect: () => store.select(null) },
        // Nearest ancestor first; reverse so the page reads first, the selected block last.
        ...[...ancestorIds(doc, selected)].reverse().map(id => ({
          id,
          label: label(id),
          onSelect: () => store.select(id),
        })),
        { id: selected, label: label(selected) },
      ]
    : [{ id: 'page', label: 'Page' }];

  return (
    // `.ne-ui` styles it outside EditorShell too (the old chrome's canvas header).
    <span className="ne-ui" style={{ display: 'contents', ...style }}>
      <BreadcrumbView ariaLabel="Block path" items={items} />
    </span>
  );
}
