/**
 * Drag and drop onto the canvas (R690). Drags always start in the editor page
 * (the insert panel, or the handle on a selected block) and a full-screen
 * layer keeps the pointer there while dragging, so pointer events never get
 * lost inside the iframe. The pointer is mapped into the frame to find the
 * deepest slot that accepts the block, using the nesting rules.
 *
 * dnd-kit is not used here because it cannot follow a pointer into an iframe;
 * it remains the choice for in-page lists such as the layers panel (R692).
 */

import { findPosition, type NodeId } from '@nextcms/builder-core';
import {
  type PointerEvent as ReactPointerEvent,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { type DropTarget, findDropTarget, nearestSlot } from './dom';
import { autoScrollSpeed, type Point } from './drop';
import type { EditorStore } from './store';

export type DragPayload =
  | { kind: 'new'; type: string; props?: Record<string, unknown> }
  | { kind: 'move'; id: NodeId };

export type DragState = {
  payload: DragPayload | null;
  /** True once the pointer moved far enough to count as a drag. */
  active: boolean;
  target: DropTarget | null;
  /** Set while hovering a real slot that rejects this block (R721). */
  blockedReason: string | null;
  pointer: Point | null;
};

/** Pointer travel before a press becomes a drag, in pixels. */
export const DRAG_THRESHOLD = 4;

const IDLE: DragState = {
  payload: null,
  active: false,
  target: null,
  blockedReason: null,
  pointer: null,
};

export function createDragController(store: EditorStore) {
  let state = IDLE;
  let frame: HTMLIFrameElement | null = null;
  const listeners = new Set<() => void>();
  const set = (next: Partial<DragState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  const typeOf = (payload: DragPayload) =>
    payload.kind === 'new'
      ? payload.type
      : store.getState().doc.nodes[payload.id]?.type;

  const targetAt = (
    clientX: number,
    clientY: number,
    payload: DragPayload,
    previousTarget?: DropTarget | null
  ): { target: DropTarget | null; blockedReason: string | null } => {
    const doc = frame?.contentDocument;
    const type = typeOf(payload);
    if (!frame || !doc || !type) return { target: null, blockedReason: null };
    const box = frame.getBoundingClientRect();
    const point = { x: clientX - box.left, y: clientY - box.top };
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x > box.width ||
      point.y > box.height
    ) {
      return { target: null, blockedReason: null };
    }
    const movingId = payload.kind === 'move' ? payload.id : undefined;
    const target = findDropTarget(
      doc,
      point,
      slot => store.canPlace(type, slot, movingId),
      previousTarget
    );
    if (target) {
      if (payload.kind === 'move') {
        const sourcePos = findPosition(store.getState().doc, payload.id);
        if (
          sourcePos &&
          sourcePos.parentId === target.position.parentId &&
          sourcePos.slot === target.position.slot &&
          (target.position.index === sourcePos.index ||
            target.position.index === sourcePos.index + 1)
        ) {
          target.noop = true;
        }
      }
      return { target, blockedReason: null };
    }
    // A real slot is under the pointer, it just will not take this block.
    const nearest = nearestSlot(doc, point);
    const label = store.schemas[type]?.label ?? type;
    return {
      target: null,
      blockedReason: nearest ? `${label} can't go here` : null,
    };
  };

  const controller = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setFrame(next: HTMLIFrameElement | null) {
      frame = next;
    },

    /**
     * Starts a possible drag from a pointer press. If the pointer is released
     * before it moves, `onClick` runs instead (for example: insert at the
     * default position).
     */
    start(
      payload: DragPayload,
      event: ReactPointerEvent,
      onClick?: () => void
    ) {
      if (event.button !== 0) return;
      event.preventDefault();
      const origin = { x: event.clientX, y: event.clientY };
      let last = origin;
      let scrolling = 0;
      set({
        payload,
        active: false,
        target: null,
        blockedReason: null,
        pointer: origin,
      });

      const update = () =>
        set({
          ...targetAt(last.x, last.y, payload, state.target),
          pointer: last,
        });
      const scroll = () => {
        const win = frame?.contentWindow;
        if (state.active && frame && win) {
          const box = frame.getBoundingClientRect();
          const speed = autoScrollSpeed(last.y - box.top, box.height);
          if (speed) {
            win.scrollBy(0, speed);
            update();
          }
        }
        scrolling = requestAnimationFrame(scroll);
      };

      const onMove = (move: PointerEvent) => {
        last = { x: move.clientX, y: move.clientY };
        if (!state.active) {
          if (Math.hypot(last.x - origin.x, last.y - origin.y) < DRAG_THRESHOLD)
            return;
          set({ active: true, pointer: last });
          scrolling = requestAnimationFrame(scroll);
        }
        update();
      };
      const frameWin = frame?.contentWindow;
      const onFrameMove = (move: PointerEvent) => {
        const box = frame?.getBoundingClientRect();
        if (box) {
          onMove({
            clientX: move.clientX + box.left,
            clientY: move.clientY + box.top,
          } as PointerEvent);
        }
      };
      const finish = (drop: boolean) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
        frameWin?.removeEventListener('pointermove', onFrameMove);
        frameWin?.removeEventListener('pointerup', onUp);
        frameWin?.removeEventListener('pointercancel', onCancel);
        cancelAnimationFrame(scrolling);
        const { active, target } = state;
        set(IDLE);
        if (!drop) return;
        if (!active) onClick?.();
        else if (target && payload.kind === 'new')
          store.insertBlock(payload.type, target.position, payload.props);
        else if (target && payload.kind === 'move') {
          if (!target.noop) store.move(payload.id, target.position);
        }
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = (key: KeyboardEvent) => {
        if (key.key !== 'Escape') return;
        key.preventDefault();
        key.stopPropagation();
        finish(false);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
      frameWin?.addEventListener('pointermove', onFrameMove);
      frameWin?.addEventListener('pointerup', onUp);
      frameWin?.addEventListener('pointercancel', onCancel);
    },
  };
  return controller;
}

export type DragController = ReturnType<typeof createDragController>;

export function useDragController(store: EditorStore): DragController {
  return useMemo(() => createDragController(store), [store]);
}

export function useDragState(controller: DragController): DragState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  );
}
