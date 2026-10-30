/**
 * End-to-end editing flows without a browser (B15 E6): the real page block
 * definitions, the real editor store and save queue, and the real server save
 * step (`planEditorSave`, which the page service runs in its transaction).
 * Each flow edits, saves, and checks that reading the stored page back gives
 * exactly the editor's document. Publish is not covered (database and action).
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/editor-flows.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  type BuilderDocument,
  documentsEqual,
  type NodeId,
  normalizeDocument,
  type PuckData,
  ROOT_SLOT,
  toDocument,
} from '@nextcms/builder-core';
import {
  createEditorStore,
  createSaveQueue,
  type SaveInput,
  type SaveResult,
} from '@nextcms/builder-react';
import { editorSetup } from '../definitions';
import { planEditorSave } from '../editor-save';

const setup = editorSetup('page');

/**
 * Stored pages carry each block's id in its props too (Puck's format, and
 * what keeps patch saves in sync); that copy is not content, so compare
 * without it. Everything else must match exactly.
 */
function withoutPropIds(doc: BuilderDocument): BuilderDocument {
  const nodes = Object.fromEntries(
    Object.entries(doc.nodes).map(([id, node]) => {
      const { id: propId, ...props } = node.props as Record<string, unknown>;
      return [id, { ...node, props: propId === id ? props : node.props }];
    })
  );
  return { ...doc, nodes };
}

/** A page draft held "on the server", saved only through planEditorSave. */
function fakeServer() {
  const server = { content: null as PuckData | null, version: 0, saves: 0 };
  const save = async (input: SaveInput): Promise<SaveResult> => {
    const plan = planEditorSave(server.content, server.version, input);
    if (plan.kind === 'conflict') {
      return {
        ok: false,
        conflict: true,
        version: plan.version,
        document: plan.document,
      };
    }
    if (plan.kind !== 'save') {
      throw new Error(
        plan.kind === 'invalid' ? plan.problems.join('; ') : 'Nothing to save.'
      );
    }
    server.content = plan.content;
    server.version += 1;
    server.saves += 1;
    return { ok: true, version: server.version };
  };
  return { server, save };
}

function openEditor() {
  const { server, save } = fakeServer();
  let n = 0;
  const store = createEditorStore({
    document: toDocument(server.content),
    schemas: setup.schemas,
    createId: type => `${type}-${++n}`,
  });
  const queue = createSaveQueue({
    store,
    save,
    version: server.version,
    autosave: false,
  });
  queue.start();
  /** Saves pending work and fails the test if the save did not land. */
  const flush = async () => {
    await queue.flush();
    assert.equal(
      queue.getState().status,
      'saved',
      queue.getState().error ?? 'not saved'
    );
  };
  /**
   * The stored page, read back the way the editor opens it: the store
   * normalizes with the block schemas, which restores empty slots (stored
   * inline, an empty slot reads back as an empty array prop).
   */
  const stored = () =>
    normalizeDocument(toDocument(server.content), setup.schemas);
  const assertInSync = () =>
    assert.ok(
      documentsEqual(
        withoutPropIds(stored()),
        withoutPropIds(store.getState().doc)
      ),
      'stored page differs from the editor'
    );
  return { server, store, queue, flush, stored, assertInSync };
}

const insert = (
  store: ReturnType<typeof createEditorStore>,
  type: string,
  at?: { parentId: NodeId | null; slot: string; index: number }
) => {
  const id = store.insertBlock(type, at);
  assert.ok(id, `could not insert ${type}`);
  return id;
};

describe('editor flows end to end (B15 E6)', () => {
  it('adds blocks, nests one in a container, and saves them as they are', async () => {
    const editor = openEditor();
    const hero = insert(editor.store, 'Hero');
    const box = insert(editor.store, 'Container');
    const nested = insert(editor.store, 'Hero', {
      parentId: box,
      slot: 'content',
      index: 0,
    });
    await editor.flush();
    editor.assertInSync();
    const doc = editor.stored();
    assert.deepEqual(doc.rootSlot, [hero, box]);
    assert.deepEqual(doc.nodes[box]?.slots.content, [nested]);
  });

  it('moves a block out of a container and between slots', async () => {
    const editor = openEditor();
    const box = insert(editor.store, 'Container');
    const nested = insert(editor.store, 'Hero', {
      parentId: box,
      slot: 'content',
      index: 0,
    });
    await editor.flush();
    editor.store.move(nested, { parentId: null, slot: ROOT_SLOT, index: 0 });
    await editor.flush();
    editor.assertInSync();
    assert.deepEqual(editor.stored().rootSlot, [nested, box]);
    editor.store.move(nested, { parentId: box, slot: 'content', index: 0 });
    await editor.flush();
    editor.assertInSync();
    assert.deepEqual(editor.stored().nodes[box]?.slots.content, [nested]);
  });

  it('undoes an insert after it was saved, and before it was saved', async () => {
    const editor = openEditor();
    insert(editor.store, 'Hero');
    await editor.flush();
    editor.store.undo();
    await editor.flush();
    editor.assertInSync();
    assert.deepEqual(editor.stored().rootSlot, []);

    insert(editor.store, 'Container');
    editor.store.undo();
    await editor.flush();
    editor.assertInSync();
  });

  it('redoes, and edits a block added in this session after its first save', async () => {
    const editor = openEditor();
    const hero = insert(editor.store, 'Hero');
    await editor.flush();
    editor.store.undo();
    await editor.flush();
    editor.store.redo();
    await editor.flush();
    editor.assertInSync();
    editor.store.updateMeta(hero, { name: 'Welcome' });
    editor.store.duplicate([hero]);
    await editor.flush();
    editor.assertInSync();
    assert.equal(editor.stored().rootSlot.length, 2);
    editor.store.remove([hero]);
    await editor.flush();
    editor.assertInSync();
    assert.equal(editor.stored().rootSlot.length, 1);
  });

  it('stops on a version conflict, then keeps this editor’s page on request', async () => {
    const editor = openEditor();
    insert(editor.store, 'Hero');
    await editor.flush();

    // Someone else saves the page in between.
    const other = planEditorSave(editor.server.content, editor.server.version, {
      baseVersion: editor.server.version,
      document: { ...editor.stored(), rootSlot: [], nodes: {} },
    });
    assert.equal(other.kind, 'save');
    if (other.kind === 'save') {
      editor.server.content = other.content;
      editor.server.version += 1;
    }

    insert(editor.store, 'Container');
    await editor.queue.flush();
    assert.equal(editor.queue.getState().status, 'conflict');
    assert.deepEqual(
      editor.stored().rootSlot,
      [],
      'the other save is untouched'
    );

    await editor.queue.keepMine();
    assert.equal(editor.queue.getState().status, 'saved');
    editor.assertInSync();
  });

  it('rejects a document the server would not store, and keeps the stored page', async () => {
    const editor = openEditor();
    insert(editor.store, 'Hero');
    await editor.flush();
    const before = editor.stored();
    const plan = planEditorSave(editor.server.content, editor.server.version, {
      baseVersion: editor.server.version,
      document: { ...before, rootSlot: [...before.rootSlot, 'missing'] },
    });
    assert.equal(plan.kind, 'invalid');
    assert.ok(documentsEqual(editor.stored(), before));
  });
});
