/**
 * Undo and redo over document snapshots (R688). Commands return new documents
 * that share unchanged nodes, so keeping snapshots is cheap.
 */

import type { BuilderDocument } from './document';

export type HistoryEntry = { doc: BuilderDocument; label: string };

export type HistoryState = {
  past: HistoryEntry[];
  present: HistoryEntry;
  future: HistoryEntry[];
  /** Key and time of the last commit, for merging a typing burst into one step. */
  lastMerge?: { key: string; at: number };
};

export type CommitOptions = {
  label: string;
  /** Commits with the same key within `mergeWindowMs` replace each other. */
  mergeKey?: string;
  now?: number;
};

export const HISTORY_LIMIT = 200;
export const MERGE_WINDOW_MS = 1000;

export function createHistory(doc: BuilderDocument): HistoryState {
  return { past: [], present: { doc, label: 'Open' }, future: [] };
}

export function commit(
  history: HistoryState,
  doc: BuilderDocument,
  { label, mergeKey, now = Date.now() }: CommitOptions
): HistoryState {
  if (doc === history.present.doc) return history;
  const merge =
    mergeKey !== undefined &&
    history.lastMerge?.key === mergeKey &&
    now - history.lastMerge.at < MERGE_WINDOW_MS;
  return {
    past: merge
      ? history.past
      : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: { doc, label },
    future: [],
    lastMerge: mergeKey === undefined ? undefined : { key: mergeKey, at: now },
  };
}

export const canUndo = (history: HistoryState) => history.past.length > 0;
export const canRedo = (history: HistoryState) => history.future.length > 0;

export function undo(history: HistoryState): HistoryState {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: HistoryState): HistoryState {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}
