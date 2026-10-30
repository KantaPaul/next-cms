/**
 * Reusable style classes (R724 / UXE-14): save a block's style as a named
 * class, apply it to other blocks, see where it is used, and detach it.
 * Classes live in editor state; blocks reference them by name. The host
 * decides how to render a class (typically as a CSS class name on the block).
 */

import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import type { NodeId } from '@nextcms/builder-core';

export type StyleClass = {
  name: string;
  /** Style properties captured from a block (host-specific keys). */
  styles: Record<string, unknown>;
  /** Block ids currently using this class. */
  usedBy: NodeId[];
  createdAt: number;
  updatedAt: number;
};

export type StyleClassState = {
  classes: Record<string, StyleClass>;
  /** The class name applied to each block. */
  blockClasses: Record<NodeId, string>;
};

const STORAGE_KEY = 'nextcms-style-classes';

export function createStyleClassStore(): {
  subscribe: (listener: () => void) => () => void;
  getState: () => StyleClassState;
  /** Create or update a named class from a block's styles. */
  saveClass(name: string, styles: Record<string, unknown>): void;
  /** Apply a class to a block, replacing any existing class. */
  applyClass(blockId: NodeId, className: string): void;
  /** Remove the class from a block. */
  detachClass(blockId: NodeId): void;
  /** Delete a class and detach it from all blocks. */
  deleteClass(className: string): void;
  /** Rename a class. */
  renameClass(oldName: string, newName: string): void;
  /** Which blocks use a class. */
  blocksUsing(className: string): NodeId[];
} {
  let state: StyleClassState = { classes: {}, blockClasses: {} };
  const listeners = new Set<() => void>();
  const set = (next: Partial<StyleClassState>) => {
    state = { ...state, ...next };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
    for (const listener of listeners) listener();
  };

  // Load from localStorage on creation.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch { /* noop */ }

  const store = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    saveClass(name: string, styles: Record<string, unknown>) {
      const existing = state.classes[name];
      const next: StyleClass = {
        name,
        styles,
        usedBy: existing ? existing.usedBy : [],
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now(),
      };
      set({ classes: { ...state.classes, [name]: next } });
    },

    applyClass(blockId: NodeId, className: string) {
      const klass = state.classes[className];
      if (!klass) return;
      const nextBlockClasses = { ...state.blockClasses, [blockId]: className };
      const nextClasses = { ...state.classes };
      const nextClass = { ...klass };
      if (!nextClass.usedBy.includes(blockId)) nextClass.usedBy = [...klass.usedBy, blockId];
      nextClasses[className] = nextClass;
      const prev = state.blockClasses[blockId];
      if (prev && prev !== className) {
        const prevClass = nextClasses[prev];
        if (prevClass) {
          prevClass.usedBy = prevClass.usedBy.filter(id => id !== blockId);
          nextClasses[prev] = prevClass;
        }
      }
      set({ blockClasses: nextBlockClasses, classes: nextClasses });
    },

    detachClass(blockId: NodeId) {
      const prev = state.blockClasses[blockId];
      if (!prev) return;
      const nextBlockClasses = { ...state.blockClasses };
      delete nextBlockClasses[blockId];
      const nextClasses = { ...state.classes };
      const prevClass = nextClasses[prev];
      if (prevClass) {
        prevClass.usedBy = prevClass.usedBy.filter(id => id !== blockId);
        nextClasses[prev] = prevClass;
      }
      set({ blockClasses: nextBlockClasses, classes: nextClasses });
    },

    deleteClass(className: string) {
      const klass = state.classes[className];
      if (!klass) return;
      const nextClasses = { ...state.classes };
      delete nextClasses[className];
      const nextBlockClasses = { ...state.blockClasses };
      for (const blockId of klass.usedBy) delete nextBlockClasses[blockId];
      set({ classes: nextClasses, blockClasses: nextBlockClasses });
    },

    renameClass(oldName: string, newName: string) {
      const klass = state.classes[oldName];
      if (!klass || state.classes[newName]) return;
      const nextClasses = { ...state.classes };
      delete nextClasses[oldName];
      nextClasses[newName] = { ...klass, name: newName, updatedAt: Date.now() };
      const nextBlockClasses = { ...state.blockClasses };
      for (const [blockId, cn] of Object.entries(state.blockClasses)) {
        if (cn === oldName) nextBlockClasses[blockId as NodeId] = newName;
      }
      set({ classes: nextClasses, blockClasses: nextBlockClasses });
    },

    blocksUsing(className: string): NodeId[] {
      return (state.classes[className]?.usedBy ?? []).slice();
    },
  };

  return store;
}

export type StyleClassStore = ReturnType<typeof createStyleClassStore>;

/** Global store set by the host; components read it through useStyleClasses. */
let styleClassStore: StyleClassStore | null = null;
export function setStyleClassStore(store: StyleClassStore) {
  styleClassStore = store;
}
export function getStyleClassStore(): StyleClassStore | null {
  return styleClassStore;
}

/** Reads style classes from the host-provided store. */
export function useStyleClasses(): StyleClassState {
  const [state, setState] = useState(() => styleClassStore?.getState() ?? { classes: {}, blockClasses: {} });
  useSyncExternalStore(
    () => {
      if (!styleClassStore) return () => {};
      return styleClassStore.subscribe(() => setState(styleClassStore!.getState()));
    },
    () => styleClassStore?.getState() ?? { classes: {}, blockClasses: {} },
    () => styleClassStore?.getState() ?? { classes: {}, blockClasses: {} }
  );
  return state;
}
