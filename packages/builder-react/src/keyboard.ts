/**
 * Keyboard control for the canvas (R691 / ENG-12). The mapping is a pure
 * function so it can be tested and shown in a shortcut list later (MKT-02).
 */

import { useEffect } from 'react';
import type { EditorStore } from './store';
import {
  copyBlockStyle,
  inspectBlock,
  pasteBlockStyle,
} from './style-clipboard';

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
  | 'copy-style'
  | 'paste-style'
  | 'inspect'
  | 'undo'
  | 'redo'
  | 'save'
  | 'help'
  | 'settings-content'
  | 'settings-style'
  | 'settings-advanced';

/** Inspector tabs the ⌥C / ⌥S / ⌥A shortcuts switch to (or custom block tabs). */
export type SettingsTabId = string;

/**
 * Fired on the editor window when a settings-tab shortcut runs and no
 * `onSettingsTab` handler is given; SettingsView listens for it.
 */
export const SETTINGS_TAB_EVENT = 'nextcms:settings-tab';

const SETTINGS_TAB_ACTIONS: Record<string, SettingsTabId> = {
  'settings-content': 'content',
  'settings-style': 'style',
  'settings-advanced': 'advanced',
};

type KeyInput = {
  key: string;
  /** Physical key; needed for Alt shortcuts, since ⌥C types "ç" on macOS. */
  code?: string;
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
  ['copy-style', 'Alt + Mod + C'],
  ['paste-style', 'Alt + Mod + V'],
  ['inspect', 'Alt + I'],
  ['delete', 'Delete or Backspace'],
  ['undo', 'Mod + Z'],
  ['redo', 'Mod + Shift + Z or Mod + Y'],
  ['save', 'Mod + S'],
  ['help', '? or Mod + /'],
  ['settings-content', 'Alt + C'],
  ['settings-style', 'Alt + S'],
  ['settings-advanced', 'Alt + A'],
  ['deselect', 'Escape'],
];

/** Maps a key press to an editor action; Mod is Cmd on macOS and Ctrl elsewhere. */
export function keyAction(input: KeyInput): KeyAction | null {
  const mod = !!(input.metaKey || input.ctrlKey);
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  const isKey = (letter: string) => {
    if (key === letter) return true;
    if (input.code?.toLowerCase() === `key${letter}`) return true;
    return false;
  };

  if (mod) {
    if (input.altKey) {
      if (isKey('c')) return 'copy-style';
      if (isKey('v')) return 'paste-style';
    }
    if (key === 'z') return input.shiftKey ? 'redo' : 'undo';
    if (key === 'y') return 'redo';
    if (isKey('d')) return 'duplicate';
    if (isKey('c')) return 'copy';
    if (isKey('x')) return 'cut';
    if (isKey('v')) return 'paste';
    if (isKey('s')) return 'save';
    if (key === '/') return 'help';
    return null;
  }
  if (input.altKey && !input.shiftKey) {
    if (isKey('c')) return 'settings-content';
    if (isKey('s')) return 'settings-style';
    if (isKey('a')) return 'settings-advanced';
    if (isKey('i')) return 'inspect';
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
  /** Switches the inspector tab; defaults to firing SETTINGS_TAB_EVENT. */
  onSettingsTab?: (tab: SettingsTabId) => void;
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
  const settingsTab = SETTINGS_TAB_ACTIONS[action];
  if (settingsTab) {
    if (handlers?.onSettingsTab) handlers.onSettingsTab(settingsTab);
    else requestSettingsTab(settingsTab);
    return true;
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
    case 'copy-style':
      return copyBlockStyle(store, id) !== null;
    case 'paste-style':
      return pasteBlockStyle(store, id);
    case 'inspect':
      inspectBlock(store, id);
      return true;
  }
  return false;
}

/** Asks the open SettingsView to show a tab (see SETTINGS_TAB_EVENT). */
export function requestSettingsTab(tab: SettingsTabId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<SettingsTabId>(SETTINGS_TAB_EVENT, { detail: tab })
  );
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
