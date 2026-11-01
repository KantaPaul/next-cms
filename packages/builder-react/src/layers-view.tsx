/**
 * Layers view (E12 / R692): document hierarchy tree with search, selection,
 * drag-and-drop reordering, rename, visibility toggle, and lock toggle.
 */

import type { NodeId } from '@nextcms/builder-core';
import { type LayerNode, LayersTree } from '@nextcms/editor-ui';
import { Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { layerNodes } from './layers';

export interface LayersViewProps {
  className?: string;
  showSearch?: boolean;
}

export function LayersView({ className, showSearch = true }: LayersViewProps) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const [searchQuery, setSearchQuery] = useState('');

  const rawNodes = useMemo(() => {
    return layerNodes(doc, type => store.schemas[type]?.label ?? type);
  }, [doc, store.schemas]);

  // Filter nodes if a query is typed
  const nodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawNodes;

    const filterTree = (list: LayerNode[]): LayerNode[] => {
      const result: LayerNode[] = [];
      for (const node of list) {
        const matchesSelf =
          node.name.toLowerCase().includes(q) ||
          node.type.toLowerCase().includes(q);
        const filteredChildren = node.children ? filterTree(node.children) : [];
        if (matchesSelf || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
      }
      return result;
    };

    return filterTree(rawNodes);
  }, [rawNodes, searchQuery]);

  const selectedId = selection.length === 1 ? selection[0] : null;

  const handleSelect = (id: string, options?: { additive?: boolean }) => {
    store.select(id, options);
  };

  const handleRename = (id: string, name: string) => {
    store.updateMeta(id, { name });
  };

  const handleToggleHide = (id: string) => {
    const current = !!doc.nodes[id]?.meta?.hidden;
    store.updateMeta(id, { hidden: !current });
  };

  const handleToggleLock = (id: string) => {
    const current = !!doc.nodes[id]?.meta?.locked;
    store.updateMeta(id, { locked: !current });
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {showSearch && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px',
            borderBottom: '1px solid var(--ne-border)',
            background: 'var(--ne-surface)',
          }}
        >
          <Search size={13} style={{ color: 'var(--ne-text-muted)', flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Filter layers…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              fontSize: 12,
              color: 'var(--ne-text)',
              outline: 'none',
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }} className="ne-scrollbar">
        <LayersTree
          nodes={nodes}
          selectedId={selectedId ?? undefined}
          selectedIds={selection}
          onSelect={handleSelect}
          onRename={handleRename}
          onToggleHide={handleToggleHide}
          onToggleLock={handleToggleLock}
          onHover={id => store.hover(id)}
        />
      </div>
    </div>
  );
}
