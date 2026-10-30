/**
 * Canvas resize handles (R695). The host says which handles a block has and
 * how a value maps to props (for example section width or spacing), so the
 * package stays independent of any style system. Dragging shows the change
 * live and records one undo step on release; Escape cancels. Each handle is
 * also a slider: arrow keys change the value (Shift for bigger steps).
 */

import type { BuilderNode, Device, NodeId } from '@nextcms/builder-core';
import { ResizeHandle as ResizeHandleView } from '@nextcms/editor-ui';
import { type KeyboardEvent, type PointerEvent, useState } from 'react';
import { useEditor, useEditorStore } from './context';
import { nodeElement } from './dom';
import type { Rect } from './drop';

export type ResizeHandle = {
  id: string;
  label: string;
  /** `right` changes a width; `bottom` changes a height or bottom spacing. */
  edge: 'right' | 'bottom';
  unit: 'px' | '%';
  min?: number;
  max?: number;
  step?: number;
  /** The value set for the device (including inherited values), if any. */
  read: (props: Record<string, unknown>, device: Device) => number | undefined;
  /** Prop patch that sets `value` for the device; `start` is the value before this change. */
  write: (
    props: Record<string, unknown>,
    device: Device,
    value: number,
    context: { start: number }
  ) => Record<string, unknown>;
  /** Starting value when nothing is set, from the block's measured size and first element. */
  fallback?: (size: {
    width: number;
    height: number;
    parentWidth: number;
    element: Element | null;
  }) => number;
};

export type ResizeHandlesFor = (node: BuilderNode) => ResizeHandle[];

function clamp(value: number, handle: ResizeHandle) {
  const step = handle.step ?? 1;
  const rounded = Math.round(value / step) * step;
  return Math.min(
    handle.max ?? Number.POSITIVE_INFINITY,
    Math.max(handle.min ?? 0, rounded)
  );
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
  // Read props from the store, not the render, so fast key repeats each count.
  const latest = () => store.getState().doc.nodes[id]?.props ?? props;
  const current = () =>
    handle.read(latest(), device) ?? handle.fallback?.(measure()) ?? 0;
  const value = live ?? handle.read(props, device);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const base = props;
    const start = current();
    const { parentWidth } = measure();
    const origin = handle.edge === 'right' ? event.clientX : event.clientY;
    const target = event.currentTarget;

    const onMove = (move: globalThis.PointerEvent) => {
      const delta =
        (handle.edge === 'right' ? move.clientX : move.clientY) - origin;
      const change = handle.unit === '%' ? (delta / parentWidth) * 100 : delta;
      const next = clamp(start + change, handle);
      setLive(next);
      store.updatePropsLive(id, handle.write(base, device, next, { start }));
    };
    const finish = (cancel: boolean) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      setLive(null);
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
    const start = current();
    const next = clamp(start + keys[event.key] * step, handle);
    store.updateProps(
      id,
      handle.write(latest(), device, next, { start }),
      `resize:${id}:${handle.id}`
    );
  };

  const shown =
    value === undefined
      ? 'auto'
      : `${Math.round(value * 10) / 10}${handle.unit}`;

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
      onPointerDown={onPointerDown}
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
  const node = useEditor(state => state.doc.nodes[id]);
  if (!node || node.meta?.locked) return null;
  return (
    <>
      {handlesFor(node).map(handle => (
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
