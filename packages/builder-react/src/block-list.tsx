/**
 * A plain list of blocks to add: click to insert after the selection, or drag
 * onto the canvas. The full insert panel (search, favorites, previews) is
 * UXE-04 (R714); this is the minimum to place blocks.
 */

import { useEditorStore } from './context';
import type { DragController } from './drag';

export type BlockGroup = { title: string; types: string[] };

export function BlockList({ groups, drag }: { groups: BlockGroup[]; drag: DragController }) {
  const store = useEditorStore();
  return (
    <nav aria-label="Blocks" style={{ display: 'grid', gap: 16 }}>
      {groups.map(group => (
        <section key={group.title}>
          <h3 style={{ margin: '0 0 6px', font: '600 11px/1.4 system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '.04em', opacity: 0.6 }}>
            {group.title}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {group.types.map(type => (
              <li key={type}>
                <button
                  type="button"
                  title="Click to add, or drag onto the page"
                  onPointerDown={event =>
                    drag.start({ kind: 'new', type }, event, () => store.insertBlock(type))
                  }
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      store.insertBlock(type);
                    }
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(127,127,127,.25)',
                    background: 'transparent',
                    color: 'inherit',
                    font: '500 13px/1.4 system-ui, sans-serif',
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                >
                  {store.schemas[type]?.label ?? type}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
