/**
 * Keyboard control for the canvas (R691 / ENG-12). The mapping is a pure
 * function so it can be tested and shown in a shortcut list later (MKT-02).
 */

import { useEffect } from 'react';
import type { EditorStore } from './store';

export type KeyAction =
  | 'deselect'
  | 'select-parent'
  | 'select-child'
  | 'select-previous'
  | 'select-next'
  | 'move-up'
  | 'move-down'
  | 'delete'
  | 'duplicate'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'save'
  | 'help';

type KeyInput = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
};

/** Shortcut list: [action, keys as shown to the user]. */
export const SHORTCUTS: [KeyAction, string][] = [
  ['select-previous', '↑'],
  ['select-next', '↓'],
  ['select-parent', 'Shift + Enter'],
  ['select-child', 'Enter'],
  ['move-up', 'Alt + ↑'],
  ['move-down', 'Alt + ↓'],
  ['duplicate', 'Mod + D'],
  ['copy', 'Mod + C'],
  ['cut', 'Mod + X'],
  ['paste', 'Mod + V'],
  ['delete', 'Delete or Backspace'],
  ['undo', 'Mod + Z'],
  ['redo', 'Mod + Shift + Z or Mod + Y'],
  ['save', 'Mod + S'],
  ['help', '? or Mod + /'],
  ['deselect', 'Escape'],
];

/** Maps a key press to an editor action; Mod is Cmd on macOS and Ctrl elsewhere. */
export function keyAction(input: KeyInput): KeyAction | null {
  const mod = !!(input.metaKey || input.ctrlKey);
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (mod) {
    if (key === 'z') return input.shiftKey ? 'redo' : 'undo';
    if (key === 'y') return 'redo';
    if (key === 'd') return 'duplicate';
    if (key === 'c') return 'copy';
    if (key === 'x') return 'cut';
    if (key === 'v') return 'paste';
    if (key === 's') return 'save';
    if (key === '/') return 'help';
    return null;
  }
  if (key === '?' || (input.shiftKey && key === '/')) return 'help';
  if (key === 'Escape') return 'deselect';
  if (key === 'Delete' || key === 'Backspace') return 'delete';
  if (key === 'Enter') return input.shiftKey ? 'select-parent' : 'select-child';
  if (key === 'ArrowUp') return input.altKey ? 'move-up' : 'select-previous';
  if (key === 'ArrowDown') return input.altKey ? 'move-down' : 'select-next';
  return null;
}

/** Typing in a field must never trigger canvas shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.closest !== 'function') return false;
  return !!element.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

export type KeyActionHandlers = {
  onSave?: () => void | Promise<void>;
  onHelp?: () => void;
};

export function runKeyAction(
  store: EditorStore,
  action: KeyAction,
  handlers?: KeyActionHandlers
): boolean {
  if (action === 'save') {
    if (handlers?.onSave) {
      void handlers.onSave();
      return true;
    }
    return false;
  }
  if (action === 'help') {
    if (handlers?.onHelp) {
      handlers.onHelp();
      return true;
    }
    return false;
  }
  const selected = store.getState().selection;
  const id = selected[0];
  // Clipboard and undo work without a selection; the rest need one, except
  // arrow keys, which start a selection at the first or last block.
  switch (action) {
    case 'undo':
      store.undo();
      return true;
    case 'redo':
      store.redo();
      return true;
    case 'paste':
      return store.paste() !== null;
    case 'select-previous':
      store.selectSibling(-1);
      return true;
    case 'select-next':
      store.selectSibling(1);
      return true;
  }
  if (!id) return false;
  switch (action) {
    case 'deselect':
      store.select(null);
      return true;
    case 'select-parent':
      store.selectParent();
      return true;
    case 'select-child':
      store.selectFirstChild();
      return true;
    case 'move-up':
      return store.nudge(id, -1);
    case 'move-down':
      return store.nudge(id, 1);
    case 'delete':
      return store.remove();
    case 'duplicate':
      return store.duplicate();
    case 'copy':
      return store.copy();
    case 'cut':
      store.cut();
      return true;
  }
  return false;
}

/** Listens on each given window (the editor page and the canvas iframe). */
export function useEditorKeyboard(
  store: EditorStore,
  windows: (Window | null | undefined)[],
  handlers?: KeyActionHandlers
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      const action = keyAction(event);
      if (action && runKeyAction(store, action, handlers)) event.preventDefault();
    };
    const targets = windows.filter((w): w is Window => !!w);
    for (const target of targets) target.addEventListener('keydown', onKeyDown);
    return () => {
      for (const target of targets) target.removeEventListener('keydown', onKeyDown);
    };
  }, [store, handlers, ...windows]);
}
