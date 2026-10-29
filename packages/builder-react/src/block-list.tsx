/**
 * The insert panel (R714 / UXE-04): search, categories, click to insert after
 * the selection, or drag to place anywhere. Recent/favorite blocks and a
 * live hover preview are left for a follow-up (see the B8 batch notes).
 */

import { useMemo, useState } from 'react';
import { useEditorStore } from './context';
import type { DragController } from './drag';

export type BlockGroup = { title: string; types: string[] };

const itemStyle = {
  width: '100%',
  textAlign: 'left' as const,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid rgba(127,127,127,.25)',
  background: 'transparent',
  color: 'inherit',
  font: '500 13px/1.4 system-ui, sans-serif',
  cursor: 'grab',
  touchAction: 'none',
};

export function BlockList({
  groups,
  drag,
}: {
  groups: BlockGroup[];
  drag: DragController;
}) {
  const store = useEditorStore();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        types: group.types.filter(type =>
          (store.schemas[type]?.label ?? type).toLowerCase().includes(q)
        ),
      }))
      .filter(group => group.types.length > 0);
  }, [groups, query, store]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search blocks…"
        aria-label="Search blocks"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid rgba(127,127,127,.3)',
          background: 'transparent',
          color: 'inherit',
          font: '13px/1.4 system-ui, sans-serif',
        }}
      />
      <nav aria-label="Blocks" style={{ display: 'grid', gap: 16 }}>
        {filtered.length === 0 && (
          <p
            style={{
              margin: 0,
              opacity: 0.6,
              font: '13px/1.4 system-ui, sans-serif',
            }}
          >
            No blocks match “{query}”.
          </p>
        )}
        {filtered.map(group => (
          <section key={group.title}>
            <h3
              style={{
                margin: '0 0 6px',
                font: '600 11px/1.4 system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                opacity: 0.6,
              }}
            >
              {group.title}
            </h3>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gap: 4,
              }}
            >
              {group.types.map(type => (
                <li key={type}>
                  <button
                    type="button"
                    title="Click to add, or drag onto the page"
                    onPointerDown={event =>
                      drag.start({ kind: 'new', type }, event, () =>
                        store.insertBlock(type)
                      )
                    }
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        store.insertBlock(type);
                      }
                    }}
                    style={itemStyle}
                  >
                    {store.schemas[type]?.label ?? type}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  );
}
