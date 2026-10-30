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
import { DropLine, type LayerNode, LayersTree } from '@nextcms/editor-ui';
import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, useEditorStore } from './context';
import { DRAG_THRESHOLD } from './drag';

// Rows carry editor-ui's LAYER_ROW_ATTRIBUTE; slot headings use `id::slot`.
const ROW = 'data-layer-row';

/** "column1" → "Column 1", "items[0].content" → "Item 1". */
export function slotLabel(slot: string): string {
  const panel = slot.match(/^\w+\[(\d+)\]\./);
  if (panel) return `Item ${Number(panel[1]) + 1}`;
  return slot.replace(/(\d+)$/, ' $1').replace(/^./, c => c.toUpperCase());
}

type DropAt = { position: SlotPosition; line: { top: number; left: number } };

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
  const lineAt = (y: number) => ({
    top: y - box.top + container.scrollTop,
    left: rect.left - box.left + 20,
  });

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
    const position = {
      parentId: node.id,
      slot,
      index: node.slots[slot].length,
    };
    if (canPlace(position)) return { position, line: lineAt(rect.bottom) };
  }
  const location = findPosition(doc, key);
  if (!location) return null;
  const position = {
    ...location,
    index: location.index + (ratio < 0.5 ? 0 : 1),
  };
  return canPlace(position)
    ? { position, line: lineAt(ratio < 0.5 ? rect.top : rect.bottom) }
    : null;
}

/** The document as LayersTree nodes; a block with several slots gets a heading per slot. */
export function layerNodes(
  doc: BuilderDocument,
  labelOf: (type: string) => string
): LayerNode[] {
  const toNode = (id: NodeId): LayerNode | null => {
    const node = doc.nodes[id];
    if (!node) return null;
    const slots = Object.keys(node.slots);
    const childrenOf = (slot: string) =>
      node.slots[slot].map(toNode).filter((n): n is LayerNode => n !== null);
    return {
      id,
      type: node.type,
      name: node.meta?.name || labelOf(node.type),
      renameValue: node.meta?.name ?? '',
      hidden: !!node.meta?.hidden,
      locked: !!node.meta?.locked,
      children:
        slots.length > 1
          ? slots.map(slot => ({
              id: `${id}::${slot}`,
              name: slotLabel(slot),
              type: 'slot',
              group: true,
              children: childrenOf(slot),
            }))
          : slots.length === 1
            ? childrenOf(slots[0])
            : undefined,
    };
  };
  return doc.rootSlot.map(toNode).filter((n): n is LayerNode => n !== null);
}

export function LayersPanel({ style }: { style?: CSSProperties }) {
  const store = useEditorStore();
  const doc = useEditor(state => state.doc);
  const selection = useEditor(state => state.selection);
  const hovered = useEditor(state => state.hovered);
  const [drag, setDrag] = useState<{ id: NodeId; at: DropAt | null } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useMemo(
    () => layerNodes(doc, type => store.schemas[type]?.label ?? type),
    [doc, store]
  );

  // Keep the selected row in view, as selecting on the canvas expects.
  useEffect(() => {
    const id = selection[0];
    if (!id) return;
    containerRef.current
      ?.querySelector(`[data-layer-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selection]);

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
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <LayersTree
        nodes={nodes}
        label="Layers"
        emptyLabel="No blocks yet."
        selectedIds={selection}
        onSelect={(id, options) => store.select(id, options)}
        hoveredId={hovered}
        onHover={id => store.hover(id)}
        onRowPointerDown={onStartDrag}
        onRename={(id, name) =>
          store.updateMeta(id, { name: name || undefined })
        }
        onToggleHide={id =>
          store.updateMeta(id, {
            hidden: !store.getState().doc.nodes[id]?.meta?.hidden,
          })
        }
        onToggleLock={id =>
          store.updateMeta(id, {
            locked: !store.getState().doc.nodes[id]?.meta?.locked,
          })
        }
      />
      {drag?.at && (
        <DropLine
          orientation="horizontal"
          position={{
            top: drag.at.line.top - 1,
            left: drag.at.line.left,
            length: Math.max(
              0,
              (containerRef.current?.clientWidth ?? 0) - drag.at.line.left - 4
            ),
          }}
        />
      )}
    </div>
  );
}
