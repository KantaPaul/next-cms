/**
 * Persisted style classes (R724 / UXE-14 → KRK-01): named CSS classes that
 * nodes reference by id. The host provides a `StyleClassAdapter` (database
 * backed). The store keeps an in-memory copy for the editor:
 *
 * - Creating waits for the server, because the server assigns the id that
 *   nodes then reference.
 * - Edits (name, variants) apply at once and save after a short debounce. A
 *   failed save rolls back to the last copy the server confirmed and sets
 *   `error`; it never throws from a timer.
 * - Which classes a node uses lives in the document (`node.props.classIds`),
 *   changed through editor store commands, so undo/redo and saving work.
 */

import { useSyncExternalStore } from 'react';
import {
  type BundledStyleClass,
  type CssDeclarations,
  planStyleClassImport,
  type StyleClass,
} from '@nextcms/builder-core';

export type { StyleClass } from '@nextcms/builder-core';

/** Fields for creating a class. The server assigns `id`, `siteId` and timestamps. */
export type NewStyleClass = {
  name: string;
  kind: StyleClass['kind'];
  tag?: string;
  comboOf?: string;
  variants?: Record<string, CssDeclarations>;
};

/** Fields an edit can change. Kind, tag and combo base are fixed after creation. */
export type StyleClassPatch = {
  name?: string;
  variants?: Record<string, CssDeclarations>;
};

export type StyleClassUsageHit = {
  entryId: string;
  title: string;
  nodeIds: string[];
  /** What the entry is (`page`, `global-block`, …), so the host can link to it. */
  kind?: string;
};

export type StyleClassAdapter = {
  list(): Promise<StyleClass[]>;
  create(input: NewStyleClass): Promise<StyleClass>;
  update(id: string, patch: StyleClassPatch): Promise<StyleClass>;
  remove(id: string, opts?: { force?: boolean }): Promise<void>;
  usage(id: string): Promise<StyleClassUsageHit[]>;
  /** Elements per class id across the site, from one scan. Optional; without it counts are unknown. */
  usageCounts?(): Promise<Record<string, number>>;
};

export type StyleClassState = {
  classes: Record<string, StyleClass>;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Last failed load or save, for the editor to show; cleared by `clearError`. */
  error: string | null;
  /** Edits waiting for, or in, a save. */
  pending: number;
};

export type StyleClassStoreOptions = {
  /** Debounce for edits, in ms (default 400). */
  debounceMs?: number;
  /** Called with every load or save error, e.g. to show a toast. */
  onError?: (message: string) => void;
};

const EMPTY_STATE: StyleClassState = { classes: {}, status: 'idle', error: null, pending: 0 };

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? 'Unknown error');

/** Turns a free-form name into a valid class name (`My Card` → `my-card`). */
export function slugifyClassName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!slug) return '';
  return /^[a-z]/.test(slug) ? slug : `c-${slug}`.slice(0, 80);
}

/** `name`, or `name-2`, `name-3`… — the first that is not in `taken`. */
export function uniqueClassName(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${name.slice(0, 80 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function createStyleClassStore(adapter: StyleClassAdapter, options: StyleClassStoreOptions = {}) {
  const debounceMs = options.debounceMs ?? 400;
  let state: StyleClassState = EMPTY_STATE;
  const listeners = new Set<() => void>();
  /** Last copy the server confirmed, per id: the rollback target. */
  const confirmed = new Map<string, StyleClass>();
  /** Edits not yet sent, merged per id. */
  const queued = new Map<string, StyleClassPatch>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlight = new Set<Promise<void>>();

  const set = (next: Partial<StyleClassState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  const pendingCount = () => queued.size + inFlight.size;
  const fail = (error: unknown) => {
    const message = errorMessage(error);
    set({ error: message });
    options.onError?.(message);
    return message;
  };
  const putConfirmed = (cls: StyleClass) => {
    confirmed.set(cls.id, cls);
    set({ classes: { ...state.classes, [cls.id]: cls } });
  };
  const dropLocal = (ids: Set<string>) => {
    for (const id of ids) {
      confirmed.delete(id);
      queued.delete(id);
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.delete(id);
    }
    set({
      classes: Object.fromEntries(Object.entries(state.classes).filter(([id]) => !ids.has(id))),
      pending: pendingCount(),
    });
  };

  const send = (id: string): Promise<void> => {
    timers.delete(id);
    const patch = queued.get(id);
    queued.delete(id);
    if (!patch) return Promise.resolve();
    const task = (async () => {
      try {
        const saved = await adapter.update(id, patch);
        // Keep newer local edits that were queued while this save was in flight.
        const later = queued.get(id);
        confirmed.set(id, saved);
        set({ classes: { ...state.classes, [id]: later ? { ...saved, ...later } : saved } });
      } catch (error) {
        queued.delete(id);
        const timer = timers.get(id);
        if (timer) clearTimeout(timer);
        timers.delete(id);
        const last = confirmed.get(id);
        if (last) set({ classes: { ...state.classes, [id]: last } });
        fail(error);
      }
    })();
    inFlight.add(task);
    set({ pending: pendingCount() });
    void task.finally(() => {
      inFlight.delete(task);
      set({ pending: pendingCount() });
    });
    return task;
  };

  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** The current state. The same object until something changes (safe for useSyncExternalStore). */
    getState: (): StyleClassState => state,

    /** Loads every class from the adapter. Unsaved edits are kept on top. */
    async load(): Promise<void> {
      set({ status: 'loading' });
      try {
        const rows = await adapter.list();
        confirmed.clear();
        for (const row of rows) confirmed.set(row.id, row);
        const classes: Record<string, StyleClass> = {};
        for (const row of rows) {
          const local = queued.get(row.id);
          classes[row.id] = local ? { ...row, ...local } : row;
        }
        set({ classes, status: 'ready' });
      } catch (error) {
        set({ status: 'error' });
        fail(error);
      }
    },

    /** Creates a class on the server and returns it with its real id. Throws on failure. */
    async createClass(input: NewStyleClass): Promise<StyleClass> {
      try {
        const created = await adapter.create(input);
        putConfirmed(created);
        return created;
      } catch (error) {
        fail(error);
        throw error;
      }
    },

    /** Changes a class's name or variants now; saves after the debounce. */
    updateClass(id: string, patch: StyleClassPatch): void {
      const current = state.classes[id];
      if (!current) return;
      const merged = { ...queued.get(id), ...patch };
      queued.set(id, merged);
      set({
        classes: { ...state.classes, [id]: { ...current, ...patch } },
        error: null,
        pending: pendingCount(),
      });
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.set(
        id,
        setTimeout(() => {
          void send(id);
        }, debounceMs)
      );
    },

    /** Sends every queued edit now and waits for all saves. */
    async flush(): Promise<void> {
      for (const [id, timer] of timers) {
        clearTimeout(timer);
        void send(id);
      }
      await Promise.all([...inFlight]);
    },

    /**
     * Deletes a class and, as the server does, its combo classes. Queued edits
     * for them are dropped. Restores them and throws if the server refuses.
     */
    async removeClass(id: string, opts?: { force?: boolean }): Promise<void> {
      const ids = new Set([id]);
      for (const cls of Object.values(state.classes)) if (cls.comboOf === id) ids.add(cls.id);
      const restore = [...ids].map(key => confirmed.get(key)).filter((c): c is StyleClass => !!c);
      dropLocal(ids);
      try {
        await adapter.remove(id, opts);
      } catch (error) {
        const classes = { ...state.classes };
        for (const cls of restore) {
          confirmed.set(cls.id, cls);
          classes[cls.id] = cls;
        }
        set({ classes });
        fail(error);
        throw error;
      }
    },

    usage(id: string): Promise<StyleClassUsageHit[]> {
      return adapter.usage(id);
    },

    /** Elements per class id, or null when the adapter cannot count. */
    async usageCounts(): Promise<Record<string, number> | null> {
      return adapter.usageCounts ? adapter.usageCounts() : null;
    },

    clearError(): void {
      set({ error: null });
    },

    /** Cancels queued saves (call when the editor unmounts after `flush`). */
    dispose(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      queued.clear();
      listeners.clear();
    },
  };
  return store;
}

export type StyleClassStore = ReturnType<typeof createStyleClassStore>;

let styleClassStore: StyleClassStore | null = null;
export function setStyleClassStore(store: StyleClassStore | null) {
  styleClassStore = store;
}
export function getStyleClassStore(): StyleClassStore | null {
  return styleClassStore;
}

const noopSubscribe = () => () => {};
const emptySnapshot = () => EMPTY_STATE;

/** The style class state, re-rendering when it changes. Empty when no store is set. */
export function useStyleClasses(store: StyleClassStore | null = getStyleClassStore()): StyleClassState {
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getState : emptySnapshot,
    store ? store.getState : emptySnapshot
  );
}

/* ---------- Legacy localStorage import ---------- */

export const LEGACY_STYLE_CLASS_KEY = 'nextcms-style-classes';

type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;

/**
 * One-time import of class names from the old localStorage store. Those
 * classes never reached the published site, and their styles were block
 * props (not CSS), so only the names come across, as empty classes. Names are
 * slugified and de-duplicated against existing classes. The key is removed
 * only once every name is imported, so a failure (e.g. no design permission)
 * is retried next time.
 */
export async function importLegacyStyleClasses(
  store: StyleClassStore,
  storage: LegacyStorage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage
): Promise<{ imported: number; failed: number }> {
  if (!storage) return { imported: 0, failed: 0 };
  let names: string[] = [];
  try {
    const raw = storage.getItem(LEGACY_STYLE_CLASS_KEY);
    if (!raw) return { imported: 0, failed: 0 };
    const classes = (JSON.parse(raw) as { classes?: Record<string, { name?: unknown }> })?.classes;
    names = Object.values(classes ?? {})
      .map(cls => (typeof cls?.name === 'string' ? slugifyClassName(cls.name) : ''))
      .filter(Boolean);
  } catch {
    storage.removeItem(LEGACY_STYLE_CLASS_KEY); // unreadable: nothing to import
    return { imported: 0, failed: 0 };
  }

  let imported = 0;
  let failed = 0;
  const existing = new Set(Object.values(store.getState().classes).map(cls => cls.name));
  for (const name of [...new Set(names)]) {
    if (existing.has(name)) continue; // already in the database
    try {
      await store.createClass({ name, kind: 'class', variants: {} });
      existing.add(name);
      imported++;
    } catch {
      failed++;
    }
  }
  if (failed === 0) storage.removeItem(LEGACY_STYLE_CLASS_KEY);
  return { imported, failed };
}

/* ---------- Importing a class bundle ---------- */

export type StyleClassImportResult = {
  /** Source class id → this site's class id, for `remapDocumentClassIds`. */
  map: Record<string, string>;
  reused: number;
  created: number;
  /** Classes that could not be created (e.g. no design permission); their ids are dropped. */
  failed: string[];
};

/**
 * Brings the classes of an imported file into this site (see
 * `planStyleClassImport`): reuses matching classes, creates the rest in
 * order (combo bases first), and returns the id map for the document.
 */
export async function importStyleClassBundle(
  store: StyleClassStore,
  bundle: BundledStyleClass[]
): Promise<StyleClassImportResult> {
  const steps = planStyleClassImport(bundle, Object.values(store.getState().classes));
  const result: StyleClassImportResult = { map: {}, reused: 0, created: 0, failed: [] };
  for (const step of steps) {
    if (step.action === 'reuse') {
      result.map[step.sourceId] = step.targetId;
      result.reused++;
      continue;
    }
    const comboOf = step.comboOfSource ? result.map[step.comboOfSource] : undefined;
    if (step.comboOfSource && !comboOf) {
      result.failed.push(step.name); // its base could not be created
      continue;
    }
    try {
      const created = await store.createClass({
        name: step.name,
        kind: step.kind,
        tag: step.tag,
        comboOf,
        variants: step.variants,
      });
      result.map[step.sourceId] = created.id;
      result.created++;
    } catch {
      result.failed.push(step.name);
    }
  }
  return result;
}
