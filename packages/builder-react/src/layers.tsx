/**
 * Layers panel (R692): the page as a tree. Click to select, hover to
 * highlight on the canvas, double-click or F2 to rename, toggle hidden
 * (editor only) and locked, and drag rows to reorder or move between slots.
 * Dragging uses the same pointer approach as the canvas, so one model covers
 * both; nesting rules and "not inside itself" come from the store.
 */

import {
  type BuilderDocument,
  findPosition,
  type NodeId,
  type SlotPosition,
} from '@nextcms/builder-core';
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useEditor, useEditorStore } from './context';
import { DRAG_THRESHOLD } from './drag';

const ACCENT = '#4f46e5';
const ROW = 'data-layer-row';

/** "column1" → "Column 1", "items[0].content" → "Item 1". */
export function slotLabel(slot: string): string {
  const panel = slot.match(/^\w+\[(\d+)\]\./);
  if (panel) return `Item ${Number(panel[1]) + 1}`;
  return slot.replace(/(\d+)$/, ' $1').replace(/^./, c => c.toUpperCase());
}

type DropAt = { position: SlotPosition; line: { top: number; left: number } };

const iconButton: CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  width: 20,
  textAlign: 'center',
  font: '12px/1 system-ui, sans-serif',
  opacity: 0.6,
};

function Row({
  id,
  depth,
  collapsed,
  toggle,
  onStartDrag,
}: {
  id: NodeId;
  depth: number;
  collapsed: Set<NodeId>;
  toggle: (id: NodeId) => void;
  onStartDrag: (id: NodeId, event: PointerEvent) => void;
}) {
  const store = useEditorStore();
  const node = useEditor(state => state.doc.nodes[id]);
  const selected = useEditor(state => state.selection.includes(id));
  const hovered = useEditor(state => state.hovered === id);
  const [renaming, setRenaming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!node) return null;
  const label = node.meta?.name || store.schemas[node.type]?.label || node.type;
  const slots = Object.keys(node.slots);
  const open = slots.length > 0 && !collapsed.has(id);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'F2') {
      event.preventDefault();
      setRenaming(true);
    }
  };

  return (
    <div>
      <div
        ref={ref}
        {...{ [ROW]: id }}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={slots.length ? open : undefined}
        tabIndex={0}
        onClick={event => store.select(id, { additive: event.shiftKey || event.metaKey })}
        onDoubleClick={() => setRenaming(true)}
        onKeyDown={onKeyDown}
        onPointerEnter={() => store.hover(id)}
        onPointerLeave={() => store.hover(null)}
        onPointerDown={event => {
          if ((event.target as HTMLElement).closest('button, input')) return;
          onStartDrag(id, event);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `3px 6px 3px ${6 + depth * 14}px`,
          borderRadius: 4,
          cursor: 'default',
          background: selected ? `${ACCENT}26` : hovered ? 'rgba(127,127,127,.12)' : undefined,
          opacity: node.meta?.hidden ? 0.5 : 1,
          font: '13px/1.4 system-ui, sans-serif',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <button
          type="button"
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          disabled={!slots.length}
          onClick={() => toggle(id)}
          style={{ ...iconButton, visibility: slots.length ? 'visible' : 'hidden' }}
        >
          {open ? '▾' : '▸'}
        </button>
        {renaming ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: rename starts from an explicit double-click or F2
            autoFocus
            aria-label="Block name"
            defaultValue={node.meta?.name ?? ''}
            placeholder={store.schemas[node.type]?.label ?? node.type}
            onBlur={event => {
              store.updateMeta(id, { name: event.target.value.trim() || undefined });
              setRenaming(false);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setRenaming(false);
            }}
            style={{ flex: 1, font: 'inherit', padding: '1px 4px', minWidth: 0 }}
          />
        ) : (
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        )}
        <button
          type="button"
          aria-label={node.meta?.hidden ? `Show ${label}` : `Hide ${label} in the editor`}
          aria-pressed={!!node.meta?.hidden}
          title={node.meta?.hidden ? 'Show' : 'Hide in the editor'}
          onClick={() => store.updateMeta(id, { hidden: !node.meta?.hidden })}
          style={{ ...iconButton, opacity: node.meta?.hidden ? 1 : 0.6 }}
        >
          {node.meta?.hidden ? '◌' : '◉'}
        </button>
        <button
          type="button"
          aria-label={node.meta?.locked ? `Unlock ${label}` : `Lock ${label}`}
          aria-pressed={!!node.meta?.locked}
          title={node.meta?.locked ? 'Unlock' : 'Lock'}
          onClick={() => store.updateMeta(id, { locked: !node.meta?.locked })}
          style={{ ...iconButton, opacity: node.meta?.locked ? 1 : 0.6 }}
        >
          {node.meta?.locked ? '🔒' : '🔓'}
        </button>
      </div>
      {open &&
        slots.map(slot => (
          <div key={slot}>
            {slots.length > 1 && (
              <div
                {...{ [ROW]: `${id}::${slot}` }}
                style={{
                  padding: `2px 6px 2px ${26 + (depth + 1) * 14}px`,
                  font: '600 11px/1.4 system-ui, sans-serif',
                  opacity: 0.55,
                }}
              >
                {slotLabel(slot)}
              </div>
            )}
            {node.slots[slot].map(child => (
              <Row
                key={child}
                id={child}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
                onStartDrag={onStartDrag}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

/** Where a pointer over the tree would drop: before, after, or into a row. */
function dropAt(
  doc: BuilderDocument,
  container: HTMLElement,
  clientY: number,
  canPlace: (position: SlotPosition) => boolean
): DropAt | null {
  const rows = Array.from(container.querySelectorAll<HTMLElement>(`[${ROW}]`));
  const box = container.getBoundingClientRect();
  const row = rows.find(r => {
    const rect = r.getBoundingClientRect();
    return clientY >= rect.top && clientY < rect.bottom;
  });
  if (!row) return null;
  const rect = row.getBoundingClientRect();
  const key = row.getAttribute(ROW) ?? '';
  const lineAt = (y: number) => ({ top: y - box.top + container.scrollTop, left: rect.left - box.left + 20 });

  // A slot heading: drop as the slot's first child.
  if (key.includes('::')) {
    const [parentId, slot] = key.split('::');
    const position = { parentId, slot, index: 0 };
    return canPlace(position) ? { position, line: lineAt(rect.bottom) } : null;
  }

  const node = doc.nodes[key];
  const slots = node ? Object.keys(node.slots) : [];
  const ratio = (clientY - rect.top) / rect.height;
  // The middle of a row with one slot drops inside it, at the end.
  if (node && slots.length === 1 && ratio > 0.3 && ratio < 0.7) {
    const slot = slots[0];
    const position = { parentId: node.id, slot, index: node.slots[slot].length };
    if (canPlace(position)) return { position, line: lineAt(rect.bottom) };
  }
  const location = findPosition(doc, key);
  if (!location) return null;
  const position = { ...location, index: location.index + (ratio < 0.5 ? 0 : 1) };
  return canPlace(position) ? { position, line: lineAt(ratio < 0.5 ? rect.top : rect.bottom) } : null;
}

export function LayersPanel({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const rootSlot = useEditor(state => state.doc.rootSlot);
  const [collapsed, setCollapsed] = useState<Set<NodeId>>(new Set());
  const [drag, setDrag] = useState<{ id: NodeId; at: DropAt | null } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = (id: NodeId) =>
    setCollapsed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onStartDrag = (id: NodeId, event: PointerEvent) => {
    if (event.button !== 0 || store.isLocked(id)) return;
    const startY = event.clientY;
    let active = false;
    let at: DropAt | null = null;
    const node = store.getState().doc.nodes[id];
    if (!node) return;
    const onMove = (move: globalThis.PointerEvent) => {
      if (!active && Math.abs(move.clientY - startY) < DRAG_THRESHOLD) return;
      active = true;
      const container = containerRef.current;
      at = container
        ? dropAt(store.getState().doc, container, move.clientY, position =>
            store.canPlace(node.type, position, id)
          )
        : null;
      setDrag({ id, at });
    };
    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      if (active && at) store.move(id, at.position);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
  };

  return (
    <div
      ref={containerRef}
      role="tree"
      aria-label="Layers"
      style={{ position: 'relative', ...style }}
    >
      {rootSlot.length === 0 && (
        <p style={{ margin: 0, opacity: 0.6, font: '13px/1.4 system-ui, sans-serif' }}>
          No blocks yet.
        </p>
      )}
      {rootSlot.map(id => (
        <Row key={id} id={id} depth={0} collapsed={collapsed} toggle={toggle} onStartDrag={onStartDrag} />
      ))}
      {drag?.at && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: drag.at.line.left,
            right: 4,
            top: drag.at.line.top - 1,
            height: 2,
            background: ACCENT,
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
