/**
 * Save queue (R740 / DAT-04). Watches the editor store and saves patches:
 * typing waits a moment, structural changes save at once. One save runs at
 * a time and later changes go in the next one. Failed saves retry with
 * backoff; a version conflict stops saving until the user chooses. A local
 * copy in the browser keeps unsaved work through a crash or closed tab.
 */

import {
  type BuilderDocument,
  type DocumentPatch,
  diffDocuments,
  isEmptyPatch,
} from '@nextcms/builder-core';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { EditorStore } from './store';

export type SaveInput =
  | { baseVersion: number; patch: DocumentPatch }
  | { baseVersion: number; document: BuilderDocument };

export type SaveResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; version: number; document: BuilderDocument };

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'error' | 'conflict';

export type SaveState = {
  status: SaveStatus;
  /** Server version the next save is based on. */
  version: number;
  savedAt: number | null;
  error: string | null;
  /** What the server has, when someone else saved first. */
  conflict: { version: number; document: BuilderDocument } | null;
};

/** Where unsaved work is kept between visits; IndexedDB by default. */
export type LocalCopyStorage = {
  get(key: string): Promise<LocalCopy | undefined>;
  set(key: string, value: LocalCopy): Promise<void>;
  remove(key: string): Promise<void>;
};

export type LocalCopy = { document: BuilderDocument; baseVersion: number; at: number };

export type SaveQueueOptions = {
  store: EditorStore;
  save: (input: SaveInput) => Promise<SaveResult>;
  /** Version of the document the editor opened. */
  version: number;
  /** Wait after a prop edit before saving. */
  debounceMs?: number;
  /**
   * Save on every change (default). Turn off where saving publishes, such as
   * global blocks that update every page at once; then only `flush` saves.
   */
  autosave?: boolean;
  /** Local copy key, such as `page:<id>`; omit to keep no local copy. */
  localKey?: string;
  storage?: LocalCopyStorage;
  isOnline?: () => boolean;
};

export const RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** A patch that adds, removes, or moves blocks saves without waiting. */
export function isStructural(patch: DocumentPatch, saved: BuilderDocument): boolean {
  if (patch.rootSlot || patch.remove.length) return true;
  return Object.entries(patch.upsert).some(([id, node]) => {
    const before = saved.nodes[id];
    return !before || JSON.stringify(before.slots) !== JSON.stringify(node.slots);
  });
}

export function createSaveQueue({
  store,
  save,
  version,
  debounceMs = 1_000,
  autosave = true,
  localKey,
  storage,
  isOnline = () => typeof navigator === 'undefined' || navigator.onLine,
}: SaveQueueOptions) {
  let state: SaveState = { status: 'saved', version, savedAt: null, error: null, conflict: null };
  const listeners = new Set<() => void>();
  const set = (next: Partial<SaveState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let localTimer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  let attempts = 0;
  let paused = false;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), delay);
  };

  const keepLocalCopy = () => {
    if (!storage || !localKey) return;
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      const { doc, savedDoc } = store.getState();
      if (doc === savedDoc) void storage.remove(localKey);
      else void storage.set(localKey, { document: doc, baseVersion: state.version, at: Date.now() });
    }, 300);
  };

  const send = async (input: SaveInput, doc: BuilderDocument) => {
    set({ status: 'saving' });
    try {
      const result = await save(input);
      if (!result.ok) {
        set({ status: 'conflict', conflict: { version: result.version, document: result.document } });
        return;
      }
      attempts = 0;
      store.markSaved(doc);
      set({ version: result.version, savedAt: Date.now(), error: null, conflict: null });
      keepLocalCopy();
      if (store.getState().doc !== doc) {
        set({ status: 'pending' });
        schedule(0);
      } else {
        set({ status: 'saved' });
      }
    } catch (error) {
      const delay = RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length - 1)];
      attempts += 1;
      set({
        status: isOnline() ? 'error' : 'offline',
        error: error instanceof Error ? error.message : 'Could not save',
      });
      schedule(delay);
    }
  };

  /** Saves now, unless a save is running (then it follows) or there is a conflict. */
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (state.status === 'conflict' || paused) return;
    if (inFlight) {
      await inFlight;
      return flush();
    }
    const { doc, savedDoc } = store.getState();
    const patch = diffDocuments(savedDoc, doc);
    if (isEmptyPatch(patch)) {
      if (state.status !== 'saved') set({ status: 'saved' });
      return;
    }
    inFlight = send({ baseVersion: state.version, patch }, doc).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const onStoreChange = () => {
    const { doc, savedDoc } = store.getState();
    keepLocalCopy();
    if (state.status === 'conflict' || doc === savedDoc) return;
    const patch = diffDocuments(savedDoc, doc);
    if (isEmptyPatch(patch)) return;
    if (state.status === 'saved') set({ status: 'pending' });
    if (autosave && !paused) schedule(isStructural(patch, savedDoc) ? 0 : debounceMs);
  };
  let unsubscribe: (() => void) | null = null;

  const queue = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    flush,

    /** Holds saves (for example while someone else has the page open); resuming saves what is pending. */
    setPaused(next: boolean) {
      paused = next;
      if (next) clearTimeout(timer);
      else if (autosave && state.status !== 'saved') void flush();
    },

    /** Overwrites the other save with this editor's page. */
    async keepMine() {
      const conflict = state.conflict;
      if (!conflict) return;
      set({ status: 'pending', conflict: null, version: conflict.version });
      const doc = store.getState().doc;
      inFlight = send({ baseVersion: conflict.version, document: doc }, doc).finally(() => {
        inFlight = null;
      });
      await inFlight;
    },

    /** Drops this editor's unsaved changes and loads what was saved. */
    takeTheirs() {
      const conflict = state.conflict;
      if (!conflict) return;
      store.replaceDocument(conflict.document, { label: 'Load saved version', saved: true });
      set({ status: 'saved', conflict: null, version: conflict.version });
    },

    /** Unsaved work from an earlier visit, if any is newer than what was opened. */
    async readLocalCopy(): Promise<LocalCopy | undefined> {
      if (!storage || !localKey) return undefined;
      return storage.get(localKey);
    },

    async discardLocalCopy() {
      if (storage && localKey) await storage.remove(localKey);
    },

    /**
     * Starts watching the store. Kept apart from creation so a queue made
     * during render (and thrown away by React Strict Mode) never saves.
     */
    start() {
      unsubscribe ??= store.subscribe(onStoreChange);
      return () => queue.destroy();
    },

    destroy() {
      clearTimeout(timer);
      clearTimeout(localTimer);
      unsubscribe?.();
      unsubscribe = null;
    },
  };
  return queue;
}

export type SaveQueue = ReturnType<typeof createSaveQueue>;

/** IndexedDB storage for local copies; falls back to nothing where IndexedDB is missing. */
export function indexedDbStorage(name = 'builder-local-copies'): LocalCopyStorage {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('copies');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const run = async <T,>(mode: IDBTransactionMode, action: (copies: IDBObjectStore) => IDBRequest<T>) => {
    if (typeof indexedDB === 'undefined') return undefined;
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const request = action(db.transaction('copies', mode).objectStore('copies'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
  };
  return {
    get: key => run<LocalCopy | undefined>('readonly', copies => copies.get(key)),
    set: async (key, value) => {
      await run('readwrite', copies => copies.put(value, key));
    },
    remove: async key => {
      await run('readwrite', copies => copies.delete(key));
    },
  };
}

/** Creates the queue for an editor and saves before the page closes. */
export function useSaveQueue(options: SaveQueueOptions): SaveQueue {
  // One queue per store; `save` and `version` are read when it is created.
  const queue = useMemo(() => createSaveQueue(options), [options.store]);
  useEffect(() => queue.start(), [queue]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const { doc, savedDoc } = options.store.getState();
      if (doc === savedDoc && queue.getState().status === 'saved') return;
      void queue.flush();
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [queue, options.store]);
  return queue;
}

export function useSaveState(queue: SaveQueue): SaveState {
  return useSyncExternalStore(queue.subscribe, queue.getState, queue.getState);
}
