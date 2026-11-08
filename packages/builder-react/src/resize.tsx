/**
 * Canvas resize handles (R695). The host says which handles a block has and
 * how a value maps to props (for example section width or spacing), so the
 * package stays independent of any style system. Dragging shows the change
 * live and records one undo step on release; Escape cancels. Each handle is
 * also a slider: arrow keys change the value (Shift for bigger steps).
 */

import type {
  BuilderDocument,
  BuilderNode,
  Device,
  NodeId,
} from '@nextcms/builder-core';
import { ResizeHandle as ResizeHandleView } from '@nextcms/editor-ui';
import { type KeyboardEvent, type PointerEvent, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { nodeElement, nodeRect } from './dom';
import type { Rect } from './drop';

export type ResizeNodesContext = {
  id: NodeId;
  /** Document state before this resize gesture started. */
  baseDoc: BuilderDocument;
  device: Device;
  /** Rendered widths (px) of nodes in the document at gesture start. */
  measuredWidths: Record<NodeId, number>;
  /** Pointer movement in px along the handle axis (for drag). */
  deltaPx?: number;
  /** Step delta in handle units (for keyboard arrow keys). */
  stepDelta?: number;
  /** True when resetting (double-click). */
  reset?: boolean;
  altKey?: boolean;
};

export type ResizeHandle = {
  id: string;
  label: string;
  /** `right` changes a width; `bottom` changes height or bottom spacing; `top` changes top spacing. */
  edge: 'right' | 'bottom' | 'top';
  unit: 'px' | '%';
  min?: number;
  max?: number;
  step?: number;
  snap?: number[];
  /** The value set for the device (including inherited values), if any. */
  read: (props: Record<string, unknown>, device: Device) => number | undefined;
  /** Prop patch that sets `value` for the device; `start` is the value before this change. */
  write: (
    props: Record<string, unknown>,
    device: Device,
    value: number | undefined,
    context: { start: number }
  ) => Record<string, unknown>;
  /**
   * Optional multi-node writer (e.g. resizing a column and its right-hand
   * neighbour together so the row's total width stays constant).
   */
  writeNodes?: (context: ResizeNodesContext) => {
    patches: Record<NodeId, Record<string, unknown>>;
    value?: number;
    snapped?: boolean;
  };
  /** Starting value when nothing is set, from the block's measured size and first element. */
  fallback?: (size: {
    width: number;
    height: number;
    parentWidth: number;
    element: Element | null;
  }) => number;
};

export type ResizeHandlesFor = (
  node: BuilderNode,
  doc?: BuilderDocument
) => ResizeHandle[];

export function clamp(
  value: number,
  handle: ResizeHandle,
  options?: { altKey?: boolean }
): number {
  if (!options?.altKey && handle.snap && handle.snap.length > 0) {
    const threshold = handle.unit === '%' ? 1 : 4;
    let closest = handle.snap[0];
    let minDiff = Math.abs(value - closest);
    for (let i = 1; i < handle.snap.length; i++) {
      const diff = Math.abs(value - handle.snap[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = handle.snap[i];
      }
    }
    if (minDiff <= threshold) {
      return Math.min(
        handle.max ?? Number.POSITIVE_INFINITY,
        Math.max(handle.min ?? 0, closest)
      );
    }
  }
  const step = handle.step ?? 1;
  const rounded = Math.round(value / step) * step;
  return Math.min(
    handle.max ?? Number.POSITIVE_INFINITY,
    Math.max(handle.min ?? 0, rounded)
  );
}

export function isSnapped(
  value: number,
  handle: ResizeHandle,
  options?: { altKey?: boolean }
): boolean {
  if (options?.altKey || !handle.snap || handle.snap.length === 0) return false;
  return handle.snap.some(s => Math.abs(value - s) < 0.01);
}

function Handle({
  id,
  handle,
  rect,
  frame,
}: {
  id: NodeId;
  handle: ResizeHandle;
  rect: Rect;
  frame: HTMLIFrameElement;
}) {
  const store = useEditorStore();
  const device = useEditor(state => state.device);
  const props = useEditor(state => state.doc.nodes[id]?.props);
  const [live, setLive] = useState<number | null>(null);
  const [snapped, setSnapped] = useState(false);
  if (!props) return null;

  const measure = () => {
    const wrapper = frame.contentDocument
      ? nodeElement(frame.contentDocument, id)
      : null;
    const parentWidth =
      wrapper?.parentElement?.getBoundingClientRect().width || rect.width || 1;
    return {
      width: rect.width,
      height: rect.height,
      parentWidth,
      element: wrapper?.firstElementChild ?? null,
    };
  };
  const measureNodeWidths = (docToMeasure: BuilderDocument): Record<NodeId, number> => {
    const out: Record<NodeId, number> = {};
    if (!frame.contentDocument) return out;
    for (const nid of Object.keys(docToMeasure.nodes)) {
      const r = nodeRect(frame.contentDocument, nid);
      if (r && r.width > 0) out[nid] = r.width;
    }
    return out;
  };
  const frameScale = () => {
    const box = frame.getBoundingClientRect?.();
    if (!box) return 1;
    if (handle.edge === 'right') {
      return frame.clientWidth ? box.width / frame.clientWidth : 1;
    }
    return frame.clientHeight ? box.height / frame.clientHeight : 1;
  };
  // Read props from the store, not the render, so fast key repeats each count.
  const latest = () => store.getState().doc.nodes[id]?.props ?? props;
  const current = () =>
    handle.read(latest(), device) ?? handle.fallback?.(measure()) ?? 0;
  const value = live ?? handle.read(props, device);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    store.setResizing(true);
    const base = props;
    const baseDoc = store.getState().doc;
    const measuredWidths = handle.writeNodes ? measureNodeWidths(baseDoc) : {};
    const start = current();
    const { parentWidth } = measure();
    const scale = frameScale() || 1;
    const origin = handle.edge === 'right' ? event.clientX : event.clientY;
    const target = event.currentTarget;

    const onMove = (move: globalThis.PointerEvent) => {
      const rawDelta =
        handle.edge === 'right'
          ? move.clientX - origin
          : handle.edge === 'top'
            ? origin - move.clientY
            : move.clientY - origin;
      const delta = rawDelta / scale;
      if (handle.writeNodes) {
        const res = handle.writeNodes({
          id,
          baseDoc,
          device,
          measuredWidths,
          deltaPx: delta,
          altKey: move.altKey,
        });
        if (res.value !== undefined) setLive(res.value);
        setSnapped(!!res.snapped);
        store.updateManyPropsLive(res.patches);
        return;
      }
      const change = handle.unit === '%' ? (delta / parentWidth) * 100 : delta;
      const next = clamp(start + change, handle, { altKey: move.altKey });
      setLive(next);
      setSnapped(isSnapped(next, handle, { altKey: move.altKey }));
      store.updatePropsLive(id, handle.write(base, device, next, { start }));
    };
    const finish = (cancel: boolean) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      store.setResizing(false);
      setLive(null);
      setSnapped(false);
      store.commitLive(`Resize ${handle.label.toLowerCase()}`, { cancel });
    };
    const onUp = () => finish(false);
    const onCancel = () => finish(true);
    const onKey = (key: globalThis.KeyboardEvent) => {
      if (key.key !== 'Escape') return;
      key.preventDefault();
      key.stopPropagation();
      finish(true);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (handle.writeNodes) {
      const baseDoc = store.getState().doc;
      const res = handle.writeNodes({
        id,
        baseDoc,
        device,
        measuredWidths: measureNodeWidths(baseDoc),
        reset: true,
      });
      store.updateManyProps(
        res.patches,
        `Reset ${handle.label.toLowerCase()}`,
        `Reset ${handle.label.toLowerCase()}`
      );
      return;
    }
    const start = current();
    store.updateProps(
      id,
      handle.write(latest(), device, undefined, { start }),
      `Reset ${handle.label.toLowerCase()}`
    );
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    event.stopPropagation();
    const step = (handle.step ?? 1) * (event.shiftKey ? 10 : 1);
    if (handle.writeNodes) {
      const baseDoc = store.getState().doc;
      const res = handle.writeNodes({
        id,
        baseDoc,
        device,
        measuredWidths: measureNodeWidths(baseDoc),
        stepDelta: keys[event.key] * step,
        altKey: event.altKey,
      });
      setSnapped(!!res.snapped);
      store.updateManyProps(
        res.patches,
        `Resize ${handle.label.toLowerCase()}`,
        `resize:${id}:${handle.id}`
      );
      return;
    }
    const start = current();
    const next = clamp(start + keys[event.key] * step, handle, { altKey: event.altKey });
    setSnapped(isSnapped(next, handle, { altKey: event.altKey }));
    store.updateProps(
      id,
      handle.write(latest(), device, next, { start }),
      `resize:${id}:${handle.id}`
    );
  };

  const rawShown =
    value === undefined
      ? 'auto'
      : `${Math.round(value * 10) / 10}${handle.unit}`;

  const deviceLabel =
    device === 'desktop'
      ? ''
      : ` · ${device.charAt(0).toUpperCase() + device.slice(1)}`;

  const shown = `${rawShown}${deviceLabel}`;

  return (
    <ResizeHandleView
      edge={handle.edge}
      rect={rect}
      label={handle.label}
      value={value}
      min={handle.min}
      max={handle.max}
      valueText={shown}
      active={live !== null}
      snapped={snapped || (live !== null && isSnapped(value ?? 0, handle))}
      padding={
        typeof value === 'number' && (handle.edge === 'bottom' || handle.edge === 'top')
          ? value
          : undefined
      }
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
    />
  );
}

export function ResizeHandles({
  id,
  rect,
  frame,
  handlesFor,
}: {
  id: NodeId;
  rect: Rect;
  frame: HTMLIFrameElement;
  handlesFor: ResizeHandlesFor;
}) {
  const doc = useEditor(state => state.doc);
  const node = doc.nodes[id];
  if (!node || node.meta?.locked) return null;
  return (
    <>
      {handlesFor(node, doc).map(handle => (
        <Handle
          key={handle.id}
          id={id}
          handle={handle}
          rect={rect}
          frame={frame}
        />
      ))}
    </>
  );
}
