/**
 * Editor store (R687 / ENG-08): the document with its undo history, the
 * selection, hover, and clipboard. A plain external store read through
 * `useSyncExternalStore`, so components re-render only for what they select.
 * Every document change goes through a builder-core command (R688).
 */

import {
  type BlockSchemas,
  type BuilderDocument,
  type Device,
  canPlace,
  canRedo,
  canUndo,
  cloneSubtree,
  commit,
  createHistory,
  createNode,
  createNodeId,
  type EditorRules,
  extractSubtree,
  findPosition,
  type HistoryState,
  insertSubtree,
  moveNode,
  type NodeId,
  normalizeDocument,
  normalizeNode,
  pruneDetached,
  ROOT_SLOT,
  removeNode,
  redo as redoHistory,
  type SlotPosition,
  type SlotRef,
  type Subtree,
  slotChildren,
  slotNames,
  undo as undoHistory,
  unwrapNode,
  updateProps as updateNodeProps,
  updateMeta,
  type NodeMeta,
  updateRootProps,
  wrapNodes,
} from '@nextcms/builder-core';

export type EditorState = {
  history: HistoryState;
  /** The current document (`history.present.doc`). */
  doc: BuilderDocument;
  /** Selected node ids; the first is the primary selection. */
  selection: NodeId[];
  hovered: NodeId | null;
  clipboard: Subtree | null;
  /** The document as last saved, for the unsaved-changes state. */
  savedDoc: BuilderDocument;
  /** Device the canvas shows and per-device fields edit (R694). */
  device: Device;
};

export type EditorStoreOptions = {
  document: BuilderDocument;
  schemas: BlockSchemas;
  rules?: EditorRules;
  createId?: (type: string) => NodeId;
};

type Listener = () => void;

export type EditorStore = ReturnType<typeof createEditorStore>;

export function createEditorStore({
  document,
  schemas,
  rules,
  createId = createNodeId,
}: EditorStoreOptions) {
  const initial = normalizeDocument(document, schemas);
  let state: EditorState = {
    history: createHistory(initial),
    doc: initial,
    selection: [],
    hovered: null,
    clipboard: null,
    savedDoc: initial,
    device: 'desktop',
  };
  const listeners = new Set<Listener>();

  const set = (next: Partial<EditorState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };

  /** Commits a new document to history and drops selection that no longer exists. */
  const apply = (
    doc: BuilderDocument,
    label: string,
    options: { mergeKey?: string; select?: NodeId[] } = {}
  ) => {
    if (doc === state.doc) return false;
    const history = commit(state.history, doc, { label, mergeKey: options.mergeKey });
    const selection = (options.select ?? state.selection).filter(id => doc.nodes[id]);
    set({
      history,
      doc,
      selection,
      hovered: state.hovered && doc.nodes[state.hovered] ? state.hovered : null,
    });
    return true;
  };

  const allowed = (type: string, at: SlotPosition, movingId?: NodeId) =>
    canPlace(state.doc, schemas, type, at, { movingId, rules });

  /** Default insert position: after the selected block, else at the end of the page. */
  const defaultPosition = (): SlotPosition => {
    const selected = state.selection[0];
    const position = selected ? findPosition(state.doc, selected) : null;
    if (position) return { ...position, index: position.index + 1 };
    return { parentId: null, slot: ROOT_SLOT, index: state.doc.rootSlot.length };
  };

  const insertCopy = (subtree: Subtree, at: SlotPosition, label: string) => {
    const root = subtree.nodes[subtree.rootId];
    if (!root || !allowed(root.type, at)) return null;
    const copy = cloneSubtree(subtree, createId);
    apply(insertSubtree(state.doc, copy, at), label, { select: [copy.rootId] });
    return copy.rootId;
  };

  const siblingsOf = (id: NodeId) => {
    const position = findPosition(state.doc, id);
    return position ? { position, siblings: slotChildren(state.doc, position) } : null;
  };

  const store = {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    schemas,

    /** Whether a block of `type` may go into `slot` (nesting rules, not inside itself). */
    canPlace(type: string, slot: SlotRef, movingId?: NodeId) {
      return allowed(type, { ...slot, index: 0 }, movingId);
    },

    /**
     * Inserts a new block; returns its id, or null where the block is not
     * allowed. `props` overrides the block's defaults, for inserting a named
     * preset (R781) rather than the plain block.
     */
    insertBlock(type: string, at: SlotPosition = defaultPosition(), props?: Record<string, unknown>) {
      const schema = schemas[type];
      if (!schema || !allowed(type, at)) return null;
      const node = createNode(schema, createId(type), props);
      apply(
        insertSubtree(state.doc, { rootId: node.id, nodes: { [node.id]: node } }, at),
        `Add ${schema.label ?? type}`,
        { select: [node.id] }
      );
      return node.id;
    },

    /** Whether a block is locked; locked blocks cannot be moved, deleted, or selected on the canvas. */
    isLocked(id: NodeId) {
      return !!state.doc.nodes[id]?.meta?.locked;
    },

    move(id: NodeId, to: SlotPosition) {
      const node = state.doc.nodes[id];
      if (!node || node.meta?.locked || !allowed(node.type, to, id)) return false;
      return apply(moveNode(state.doc, id, to), 'Move block', { select: [id] });
    },

    /** Moves a block one place up or down within its slot. */
    nudge(id: NodeId, delta: -1 | 1) {
      const found = siblingsOf(id);
      if (!found) return false;
      const target = found.position.index + (delta === 1 ? 2 : -1);
      if (target < 0 || target > found.siblings.length) return false;
      return store.move(id, { ...found.position, index: target });
    },

    remove(ids: NodeId[] = state.selection) {
      let doc = state.doc;
      for (const id of ids) if (!doc.nodes[id]?.meta?.locked) doc = removeNode(doc, id);
      return apply(doc, ids.length > 1 ? 'Delete blocks' : 'Delete block', { select: [] });
    },

    duplicate(ids: NodeId[] = state.selection) {
      const copies: NodeId[] = [];
      let doc = state.doc;
      for (const id of ids) {
        const subtree = extractSubtree(doc, id);
        const position = findPosition(doc, id);
        if (!subtree || !position) continue;
        const copy = cloneSubtree(subtree, createId);
        doc = insertSubtree(doc, copy, { ...position, index: position.index + 1 });
        copies.push(copy.rootId);
      }
      return apply(doc, 'Duplicate', { select: copies });
    },

    /** Merges props; pass a `mergeKey` so a typing burst becomes one undo step. */
    updateProps(id: NodeId, patch: Record<string, unknown>, mergeKey?: string) {
      const updated = updateNodeProps(state.doc, id, patch);
      const node = updated.nodes[id];
      if (!node) return false;
      const normalized = normalizeNode(node, schemas[node.type]);
      const doc = pruneDetached({ ...updated, nodes: { ...updated.nodes, [id]: normalized } });
      return apply(doc, 'Edit block', { mergeKey });
    },

    updateRootProps(patch: Record<string, unknown>, mergeKey?: string) {
      return apply(updateRootProps(state.doc, patch), 'Edit page', { mergeKey });
    },

    /**
     * Shows a prop change on the canvas without adding an undo step, for
     * dragging a resize handle. `commitLive` then records one step.
     */
    updatePropsLive(id: NodeId, patch: Record<string, unknown>) {
      const doc = updateNodeProps(state.doc, id, patch);
      if (doc !== state.doc) set({ doc });
    },

    /** Records live changes as one undo step, or drops them with `cancel`. */
    commitLive(label: string, options: { cancel?: boolean } = {}) {
      const committed = state.history.present.doc;
      if (state.doc === committed) return false;
      if (options.cancel) {
        set({ doc: committed });
        return false;
      }
      const history = commit(state.history, state.doc, { label });
      set({ history });
      return true;
    },

    /** Renames, hides, or locks a block in the editor (R692). */
    updateMeta(id: NodeId, patch: NodeMeta) {
      const label = patch.name !== undefined ? 'Rename block' : patch.hidden !== undefined ? 'Hide block' : 'Lock block';
      return apply(updateMeta(state.doc, id, patch), label);
    },

    /** Wraps the selected siblings in a new block of `type`, inside its first slot. */
    wrap(type: string, ids: NodeId[] = state.selection) {
      const schema = schemas[type];
      const slot = schema && Object.keys(schema.slots ?? {})[0];
      const first = ids[0] && findPosition(state.doc, ids[0]);
      if (!schema || !slot || !first || !allowed(type, first)) return null;
      const wrapper = createNode(schema, createId(type));
      apply(wrapNodes(state.doc, ids, wrapper, slot), `Wrap in ${schema.label ?? type}`, {
        select: [wrapper.id],
      });
      return wrapper.id;
    },

    unwrap(id: NodeId = state.selection[0]) {
      const node = id ? state.doc.nodes[id] : undefined;
      if (!node) return false;
      const children = slotNames(node).flatMap(slot => node.slots[slot]);
      return apply(unwrapNode(state.doc, id), 'Unwrap', { select: children });
    },

    undo() {
      if (!canUndo(state.history)) return;
      const history = undoHistory(state.history);
      set({ history, doc: history.present.doc, selection: state.selection.filter(id => history.present.doc.nodes[id]) });
    },

    redo() {
      if (!canRedo(state.history)) return;
      const history = redoHistory(state.history);
      set({ history, doc: history.present.doc, selection: state.selection.filter(id => history.present.doc.nodes[id]) });
    },

    select(ids: NodeId | NodeId[] | null, options: { additive?: boolean } = {}) {
      const next = ids === null ? [] : Array.isArray(ids) ? ids : [ids];
      if (!options.additive) return set({ selection: next });
      const selection = [...state.selection];
      for (const id of next) {
        const at = selection.indexOf(id);
        if (at === -1) selection.push(id);
        else selection.splice(at, 1);
      }
      set({ selection });
    },

    hover(id: NodeId | null) {
      if (state.hovered !== id) set({ hovered: id });
    },

    selectParent() {
      const id = state.selection[0];
      const parentId = id ? findPosition(state.doc, id)?.parentId : null;
      if (parentId) set({ selection: [parentId] });
    },

    selectFirstChild() {
      const node = state.doc.nodes[state.selection[0]];
      const child = node && slotNames(node).flatMap(slot => node.slots[slot])[0];
      if (child) set({ selection: [child] });
    },

    /** Selects the previous or next block in the same slot. */
    selectSibling(delta: -1 | 1) {
      const id = state.selection[0];
      if (!id) {
        const first = state.doc.rootSlot[delta === 1 ? 0 : state.doc.rootSlot.length - 1];
        if (first) set({ selection: [first] });
        return;
      }
      const found = siblingsOf(id);
      const next = found?.siblings[found.position.index + delta];
      if (next) set({ selection: [next] });
    },

    copy() {
      const subtree = state.selection[0] && extractSubtree(state.doc, state.selection[0]);
      if (subtree) set({ clipboard: subtree });
      return !!subtree;
    },

    cut() {
      if (store.copy()) store.remove();
    },

    /** Pastes after the selected block, or at the end of the page. */
    paste() {
      if (!state.clipboard) return null;
      return insertCopy(state.clipboard, defaultPosition(), 'Paste');
    },

    setDevice(device: Device) {
      if (state.device !== device) set({ device });
    },

    canUndo: () => canUndo(state.history),
    canRedo: () => canRedo(state.history),
    isDirty: () => state.doc !== state.savedDoc,
    /**
     * Replaces the whole document, as one undo step: restoring a local copy,
     * or taking the version someone else saved. `saved` marks it as stored.
     */
    replaceDocument(doc: BuilderDocument, options: { label?: string; saved?: boolean } = {}) {
      const next = normalizeDocument(doc, schemas);
      const history = commit(state.history, next, { label: options.label ?? 'Replace page' });
      set({
        history,
        doc: next,
        selection: state.selection.filter(id => next.nodes[id]),
        hovered: null,
        ...(options.saved ? { savedDoc: next } : {}),
      });
    },

    markSaved(doc: BuilderDocument = state.doc) {
      set({ savedDoc: doc });
    },
  };

  return store;
}
