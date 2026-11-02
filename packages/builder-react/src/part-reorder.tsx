/**
 * Canvas overlay for reordering a selected block's internal parts (`[data-part]`).
 * Hovering or focusing a part shows a dashed outline and a small grip pill in
 * its top corner (mirroring the toolbar side via `toolbarX`). Dragging the grip
 * uses pointer capture and reuses `slotAxis`, `dropIndex`, and `dropLine` from
 * `drop.ts` / `dom.ts`. Arrow keys on a focused grip move the part earlier/later.
 */

import {
  type BlockReorder,
  type NodeId,
  reorderParts,
} from '@nextcms/builder-core';
import { DropLine } from '@nextcms/editor-ui';
import { GripVertical } from 'lucide-react';
import React, {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useEditor, useEditorStore } from './context';
import { contentsRect, NODE_ATTR, nodeElement, slotAxis } from './dom';
import {
  type Axis,
  dropIndex,
  dropLine,
  type Point,
  type Rect,
  toolbarX,
  unionRect,
} from './drop';

export const PART_ATTR = 'data-part';

export type MeasuredPart = {
  id: string;
  label: string;
  rect: Rect;
};

/**
 * Moves a visible part from `fromVisibleIndex` to `toVisibleIndex` while
 * preserving the relative positions of any hidden/empty parts in `allIds`.
 */
export function movePartInOrder(
  allIds: readonly string[],
  visibleIds: readonly string[],
  fromVisibleIndex: number,
  toVisibleIndex: number
): string[] | null {
  if (
    fromVisibleIndex < 0 ||
    fromVisibleIndex >= visibleIds.length ||
    toVisibleIndex < 0 ||
    toVisibleIndex >= visibleIds.length ||
    fromVisibleIndex === toVisibleIndex
  ) {
    return null;
  }
  const nextVisible = [...visibleIds];
  const [moved] = nextVisible.splice(fromVisibleIndex, 1);
  nextVisible.splice(toVisibleIndex, 0, moved);

  const visibleSet = new Set(visibleIds);
  let cursor = 0;
  return allIds.map(id => (visibleSet.has(id) ? nextVisible[cursor++] : id));
}

/**
 * Resolves a `dropIndex` insertion slot (`0..visibleIds.length`) into the new
 * `partOrder` array, marking drops in the part's own slot as `noop`.
 */
export function partDropOrder(
  allIds: readonly string[],
  visibleIds: readonly string[],
  sourceIndex: number,
  dropIdx: number
): { nextOrder: string[] | null; noop: boolean } {
  if (dropIdx === sourceIndex || dropIdx === sourceIndex + 1) {
    return { nextOrder: null, noop: true };
  }
  const toVisibleIndex = dropIdx > sourceIndex ? dropIdx - 1 : dropIdx;
  return {
    nextOrder: movePartInOrder(
      allIds,
      visibleIds,
      sourceIndex,
      toVisibleIndex
    ),
    noop: false,
  };
}

/** Measures `[data-part]` elements belonging directly to block `id`. */
export function measureBlockParts(
  doc: Document,
  id: NodeId,
  reorder: BlockReorder
): { parts: MeasuredPart[]; axis: Axis; slotRect: Rect | null } {
  const blockEl = nodeElement(doc, id);
  if (!blockEl) return { parts: [], axis: 'y', slotRect: null };

  const labelById = new Map(reorder.parts.map(p => [p.id, p.label]));
  const seen = new Set<string>();
  const parts: MeasuredPart[] = [];
  let containerEl: Element | null = null;

  const elements = Array.from(blockEl.querySelectorAll(`[${PART_ATTR}]`));
  for (const el of elements) {
    if (el.closest(`[${NODE_ATTR}]`) !== blockEl) continue;
    const partId = el.getAttribute(PART_ATTR);
    if (!partId || !labelById.has(partId) || seen.has(partId)) continue;
    const rect = contentsRect(el);
    if (!rect || (rect.width === 0 && rect.height === 0)) continue;
    seen.add(partId);
    if (!containerEl) containerEl = el.parentElement;
    parts.push({
      id: partId,
      label: labelById.get(partId) ?? partId,
      rect,
    });
  }

  const rects = parts.map(p => p.rect);
  const axis = containerEl ? slotAxis(containerEl, rects) : 'y';
  const slotRect = unionRect(rects);
  return { parts, axis, slotRect };
}

function pointNearRect(point: Point, rect: Rect, pad = 6): boolean {
  return (
    point.x >= rect.left - pad &&
    point.x <= rect.left + rect.width + pad &&
    point.y >= rect.top - pad &&
    point.y <= rect.top + rect.height + pad
  );
}

export function PartReorderOverlay({
  id,
  reorder,
  frame,
  frameDoc,
  tick,
  bounds,
}: {
  id: NodeId;
  reorder: BlockReorder;
  frame: HTMLIFrameElement;
  frameDoc?: Document | null;
  tick: number;
  bounds?: { left: number; right: number; top?: number; bottom?: number };
}) {
  const store = useEditorStore();
  const props = useEditor(state => state.doc.nodes[id]?.props);
  const [measured, setMeasured] = useState<{
    parts: MeasuredPart[];
    axis: Axis;
    slotRect: Rect | null;
  }>({ parts: [], axis: 'y', slotRect: null });
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [focusedPartId, setFocusedPartId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    partId: string;
    sourceIndex: number;
    dropIdx: number;
    line: Rect;
    noop: boolean;
    tooltip?: string;
  } | null>(null);
  const overGripRef = useRef<string | null>(null);

  const propName = reorder.prop ?? 'partOrder';
  const defaultIds = reorder.parts.map(p => p.id);
  const rawOrder = Array.isArray(props?.[propName])
    ? (props[propName] as string[])
    : undefined;
  const allOrderedIds = reorderParts(rawOrder, defaultIds);

  useLayoutEffect(() => {
    const activeDoc = frameDoc ?? frame.contentDocument;
    if (!activeDoc) return;
    setMeasured(measureBlockParts(activeDoc, id, reorder));
  }, [frame, frameDoc, id, reorder, props, tick]);

  useEffect(() => {
    const activeDoc = frameDoc ?? frame.contentDocument;
    if (!activeDoc) return;

    const onMove = (event: PointerEvent) => {
      if (overGripRef.current) return;
      const target = event.target as Element | null;
      const partEl = target?.closest?.(`[${PART_ATTR}]`);
      const blockEl = nodeElement(activeDoc, id);
      if (partEl && blockEl && partEl.closest(`[${NODE_ATTR}]`) === blockEl) {
        const partId = partEl.getAttribute(PART_ATTR);
        if (partId) {
          setHoveredPartId(partId);
          return;
        }
      }
      const pt = { x: event.clientX, y: event.clientY };
      const hit = measured.parts.find(p => pointNearRect(pt, p.rect, 6));
      setHoveredPartId(hit?.id ?? null);
    };

    const onLeave = () => {
      if (!overGripRef.current) {
        setHoveredPartId(null);
      }
    };

    activeDoc.addEventListener('pointermove', onMove, { passive: true });
    activeDoc.documentElement?.addEventListener('pointerleave', onLeave);
    return () => {
      activeDoc.removeEventListener('pointermove', onMove);
      activeDoc.documentElement?.removeEventListener('pointerleave', onLeave);
    };
  }, [frame, frameDoc, id, measured.parts]);

  if (!props || measured.parts.length < 2) return null;

  const visibleIds = measured.parts.map(p => p.id);
  const partRects = measured.parts.map(p => p.rect);
  const slotRect = measured.slotRect ?? partRects[0];

  const commitOrder = (nextOrder: string[]) => {
    store.updateProps(
      id,
      { [propName]: nextOrder },
      `${id}.${propName}`
    );
  };

  const startPartDrag = (
    part: MeasuredPart,
    sourceIndex: number,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const origin = { x: event.clientX, y: event.clientY };
    let active = false;
    let currentDropIdx = sourceIndex;

    const computeAt = (clientX: number, clientY: number) => {
      const box = frame.getBoundingClientRect();
      const point: Point = {
        x: clientX - box.left,
        y: clientY - box.top,
      };
      const idx = dropIndex(
        partRects,
        point,
        measured.axis,
        currentDropIdx,
        8
      );
      currentDropIdx = idx;
      const line = dropLine(partRects, idx, measured.axis, slotRect);
      const { noop } = partDropOrder(
        allOrderedIds,
        visibleIds,
        sourceIndex,
        idx
      );
      const tooltip = noop
        ? undefined
        : idx < measured.parts.length
          ? `Insert above ${measured.parts[idx].label}`
          : `Insert below ${measured.parts[measured.parts.length - 1].label}`;
      return {
        partId: part.id,
        sourceIndex,
        dropIdx: idx,
        line,
        noop,
        tooltip,
      };
    };

    const onPointerMove = (move: globalThis.PointerEvent) => {
      if (
        !active &&
        Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < 3
      ) {
        return;
      }
      active = true;
      setDragState(computeAt(move.clientX, move.clientY));
    };

    const finish = (commit: boolean) => {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown, true);
      setDragState(null);
      if (!commit || !active) return;
      const { nextOrder, noop } = partDropOrder(
        allOrderedIds,
        visibleIds,
        sourceIndex,
        currentDropIdx
      );
      if (!noop && nextOrder) {
        commitOrder(nextOrder);
      }
    };

    const onPointerUp = () => finish(true);
    const onPointerCancel = () => finish(false);
    const onKeyDown = (key: globalThis.KeyboardEvent) => {
      if (key.key !== 'Escape') return;
      key.preventDefault();
      key.stopPropagation();
      finish(false);
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown, true);
  };

  const handleGripKeyDown = (
    sourceIndex: number,
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    const delta =
      event.key === 'ArrowUp' || event.key === 'ArrowLeft'
        ? -1
        : event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? 1
          : 0;
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const nextOrder = movePartInOrder(
      allOrderedIds,
      visibleIds,
      sourceIndex,
      sourceIndex + delta
    );
    if (nextOrder) {
      commitOrder(nextOrder);
    }
  };

  const horizontalLine =
    dragState && dragState.line.width >= dragState.line.height;

  return (
    <>
      {measured.parts.map((part, index) => {
        const isDraggingThis = dragState?.partId === part.id;
        const isShown =
          isDraggingThis ||
          (!dragState &&
            (hoveredPartId === part.id || focusedPartId === part.id));
        const pillWidth = Math.min(140, Math.max(64, part.label.length * 7 + 28));
        const pillX = toolbarX({
          left: part.rect.left,
          width: pillWidth,
          anchorRight: part.rect.left + part.rect.width,
          bounds,
        });
        const pillY = Math.max(2, part.rect.top - 22);

        return (
          <React.Fragment key={part.id}>
            {isShown && (
              <div
                aria-hidden
                data-part-outline={part.id}
                style={{
                  top: part.rect.top,
                  left: part.rect.left,
                  width: part.rect.width,
                  height: part.rect.height,
                }}
                className={`pointer-events-none absolute z-[34] rounded-[var(--ne-radius-sm)] border border-dashed border-[var(--ne-primary)] ${
                  isDraggingThis
                    ? 'bg-[var(--ne-primary)]/10 opacity-40'
                    : 'bg-[var(--ne-primary)]/[0.03]'
                }`}
              />
            )}
            <button
              type="button"
              data-part-grip={part.id}
              aria-label={`Reorder ${part.label}. Use arrow keys or drag to reorder.`}
              title={`Drag or use arrow keys to reorder ${part.label}`}
              onPointerEnter={() => {
                overGripRef.current = part.id;
                setHoveredPartId(part.id);
              }}
              onPointerLeave={() => {
                if (overGripRef.current === part.id) {
                  overGripRef.current = null;
                }
              }}
              onFocus={() => setFocusedPartId(part.id)}
              onBlur={() =>
                setFocusedPartId(prev => (prev === part.id ? null : prev))
              }
              onPointerDown={e => startPartDrag(part, index, e)}
              onKeyDown={e => handleGripKeyDown(index, e)}
              style={{
                top: pillY,
                left: pillX,
              }}
              className={`pointer-events-auto absolute z-[36] flex h-5 items-center gap-1 rounded-full border border-[var(--ne-primary)]/40 bg-[var(--ne-surface)] px-2 text-[10px] font-semibold text-[var(--ne-primary)] shadow-sm transition-opacity cursor-grab touch-none active:cursor-grabbing focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--ne-focus-ring)] ${
                isShown ? 'opacity-100' : 'opacity-0 hover:opacity-100'
              }`}
            >
              <GripVertical aria-hidden className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[100px]">{part.label}</span>
            </button>
          </React.Fragment>
        );
      })}
      {dragState && (
        <DropLine
          orientation={horizontalLine ? 'horizontal' : 'vertical'}
          position={{
            top: horizontalLine
              ? dragState.line.top + dragState.line.height / 2 - 2
              : dragState.line.top,
            left: horizontalLine
              ? dragState.line.left
              : dragState.line.left + dragState.line.width / 2 - 2,
            length: horizontalLine
              ? dragState.line.width
              : dragState.line.height,
          }}
          noop={dragState.noop}
          tooltip={dragState.tooltip}
        />
      )}
    </>
  );
}
