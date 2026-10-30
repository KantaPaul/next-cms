/**
 * Screen-reader announcements for structural edits (B15 E5, R807): moves,
 * inserts, duplicates, deletes, wraps, and undo/redo, whether they came from
 * a drag, the toolbar, the keyboard, or the palette. Typing and resize edits
 * are not announced; they would speak on every keystroke.
 */

import {
  type BuilderDocument,
  findPosition,
  type HistoryState,
  type NodeId,
  slotChildren,
} from '@nextcms/builder-core';
import { useOptionalLiveAnnouncer } from '@nextcms/editor-ui';
import { useEffect, useRef } from 'react';
import { announce as announceInPage } from './accessibility';
import type { EditorStore } from './store';

/** History labels that are not worth announcing (typing bursts, resizing). */
const QUIET = /^(Edit block|Edit page|Resize\b|Open$)/;

type Names = (doc: BuilderDocument, id: NodeId) => string;

function describeCommit(
  label: string,
  doc: BuilderDocument,
  selection: NodeId[],
  nameOf: Names
): string | null {
  if (QUIET.test(label)) return null;
  const id = selection[0];
  const name = id && doc.nodes[id] ? nameOf(doc, id) : null;
  if (label === 'Move block' && id && name) {
    const position = findPosition(doc, id);
    if (position) {
      const count = slotChildren(doc, position).length;
      return `Moved ${name}, now ${position.index + 1} of ${count}`;
    }
    return `Moved ${name}`;
  }
  if (label.startsWith('Add ')) return `Added ${label.slice(4)}`;
  if (label === 'Duplicate') return name ? `Duplicated ${name}` : 'Duplicated';
  if (label === 'Delete block') return 'Block deleted';
  if (label === 'Delete blocks') return 'Blocks deleted';
  if (label === 'Paste') return name ? `Pasted ${name}` : 'Pasted';
  return label;
}

/**
 * What changed between two history states, as a sentence, or null when it
 * is not worth announcing. Undo/redo name the step they reversed or redid.
 */
export function describeHistoryChange(
  previous: HistoryState,
  next: HistoryState,
  selection: NodeId[],
  nameOf: Names
): string | null {
  if (previous === next || previous.present === next.present) return null;
  const undone =
    next.future.length === previous.future.length + 1 &&
    next.past.length === previous.past.length - 1;
  if (undone)
    return QUIET.test(previous.present.label)
      ? null
      : `Undid ${previous.present.label}`;
  const redone =
    next.past.length === previous.past.length + 1 &&
    next.future.length === previous.future.length - 1;
  if (redone)
    return QUIET.test(next.present.label)
      ? null
      : `Redid ${next.present.label}`;
  return describeCommit(
    next.present.label,
    next.present.doc,
    selection,
    nameOf
  );
}

/**
 * Speaks structural edits: through editor-ui's LiveAnnouncer inside
 * EditorShell, else through the builder's own live region (old chrome).
 */
export function useEditorAnnouncements(store: EditorStore) {
  const live = useOptionalLiveAnnouncer();
  // The provider's value changes on every announcement; read the latest
  // through a ref so the store subscription is made once.
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    const speak = (message: string) =>
      liveRef.current
        ? liveRef.current.announce(message)
        : announceInPage(message);
    const nameOf: Names = (doc, id) => {
      const node = doc.nodes[id];
      return (
        node?.meta?.name ||
        store.schemas[node?.type ?? '']?.label ||
        node?.type ||
        'block'
      );
    };
    let previous = store.getState().history;
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const message = describeHistoryChange(
        previous,
        state.history,
        state.selection,
        nameOf
      );
      previous = state.history;
      if (message) speak(message);
    });
    return () => {
      unsubscribe();
    };
  }, [store]);
}
