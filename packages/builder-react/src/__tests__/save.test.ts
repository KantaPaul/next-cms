import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { type BlockSchemas, DOCUMENT_VERSION, type BuilderDocument } from '@nextcms/builder-core';
import { createSaveQueue, type LocalCopy, type SaveInput, type SaveResult } from '../save';
import { createEditorStore } from '../store';

const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
let timerNow = 0;
let timerNextId = 1;
type TimerEntry = { id: number; runAt: number; fn: () => void };
let activeTimers: TimerEntry[] = [];

const fakeTimers = {
  enable() {
    timerNow = 0;
    timerNextId = 1;
    activeTimers = [];
    globalThis.setTimeout = ((fn: (...args: any[]) => void, delay = 0) => {
      const id = timerNextId++;
      activeTimers.push({ id, runAt: timerNow + Math.max(0, delay), fn });
      activeTimers.sort((a, b) => a.runAt - b.runAt);
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = ((id: unknown) => {
      activeTimers = activeTimers.filter(t => t.id !== id);
    }) as unknown as typeof clearTimeout;
  },
  reset() {
    activeTimers = [];
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  },
  tick(ms: number) {
    timerNow += ms;
    while (activeTimers.length && activeTimers[0].runAt <= timerNow) {
      const next = activeTimers.shift()!;
      next.fn();
    }
  },
};
const mockTimers = fakeTimers;

const schemas: BlockSchemas = { Text: { type: 'Text', label: 'Text', defaultProps: { text: 'Hi' } } };
const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: { a: { id: 'a', type: 'Text', props: { text: 'A' }, slots: {} } },
  rootSlot: ['a'],
};

type Call = { input: SaveInput; resolve: (r: SaveResult) => void; reject: (e: Error) => void };

function setup(options: { debounceMs?: number } = {}) {
  let n = 0;
  const store = createEditorStore({ document: doc, schemas, createId: type => `${type}-${++n}` });
  const calls: Call[] = [];
  const saved = new Map<string, LocalCopy>();
  const queue = createSaveQueue({
    store,
    version: 3,
    debounceMs: options.debounceMs ?? 1000,
    save: input => new Promise((resolve, reject) => calls.push({ input, resolve, reject })),
    localKey: 'page:1',
    storage: {
      get: async key => saved.get(key),
      set: async (key, value) => void saved.set(key, value),
      remove: async key => void saved.delete(key),
    },
    isOnline: () => true,
  });
  queue.start();
  return { store, queue, calls, saved };
}

const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

describe('save queue', () => {
  beforeEach(() => {
    mockTimers.enable();
  });
  afterEach(() => mockTimers.reset());

  it('does not watch the store until started', () => {
    const store = createEditorStore({ document: doc, schemas });
    let saves = 0;
    const queue = createSaveQueue({ store, version: 0, save: async () => { saves++; return { ok: true, version: 1 }; } });
    store.updateProps('a', { text: 'x' });
    assert.equal(queue.getState().status, 'saved', 'an unstarted queue ignores changes');
    const stop = queue.start();
    store.updateProps('a', { text: 'y' });
    assert.equal(queue.getState().status, 'pending');
    stop();
    assert.equal(saves, 0);
  });

  it('debounces typing into one patch save', async () => {
    const { store, queue, calls } = setup();
    store.updateProps('a', { text: 'A1' }, 'a.text');
    store.updateProps('a', { text: 'A12' }, 'a.text');
    assert.equal(queue.getState().status, 'pending');
    mockTimers.tick(999);
    assert.equal(calls.length, 0);
    mockTimers.tick(1);
    await tick();
    assert.equal(calls.length, 1);
    const input = calls[0].input as unknown as { baseVersion: number; patch: { upsert: Record<string, { props: { text: string } }> } };
    assert.equal(input.baseVersion, 3);
    assert.deepEqual(Object.keys(input.patch.upsert), ['a']);
    assert.equal(input.patch.upsert.a.props.text, 'A12');
    calls[0].resolve({ ok: true, version: 4 });
    await tick();
    assert.equal(queue.getState().status, 'saved');
    assert.equal(queue.getState().version, 4);
    assert.ok(!store.isDirty());
  });

  it('saves structural changes at once and runs one save at a time', async () => {
    const { store, calls } = setup();
    store.insertBlock('Text');
    mockTimers.tick(0);
    await tick();
    assert.equal(calls.length, 1, 'insert saves without waiting');
    store.insertBlock('Text');
    mockTimers.tick(0);
    await tick();
    assert.equal(calls.length, 1, 'second save waits for the first');
    calls[0].resolve({ ok: true, version: 4 });
    await tick();
    mockTimers.tick(0);
    await tick();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].input.baseVersion, 4);
  });

  it('retries a failed save with backoff', async () => {
    const { store, queue, calls } = setup({ debounceMs: 0 });
    store.updateProps('a', { text: 'B' });
    mockTimers.tick(0);
    await tick();
    calls[0].reject(new Error('network down'));
    await tick();
    assert.equal(queue.getState().status, 'error');
    mockTimers.tick(999);
    await tick();
    assert.equal(calls.length, 1);
    mockTimers.tick(1);
    await tick();
    assert.equal(calls.length, 2, 'retried after 1s');
  });

  it('stops on a conflict until the user chooses', async () => {
    const { store, queue, calls } = setup({ debounceMs: 0 });
    store.updateProps('a', { text: 'Mine' });
    mockTimers.tick(0);
    await tick();
    const theirs = { ...doc, nodes: { a: { ...doc.nodes.a, props: { text: 'Theirs' } } } };
    calls[0].resolve({ ok: false, conflict: true, version: 7, document: theirs });
    await tick();
    assert.equal(queue.getState().status, 'conflict');
    store.updateProps('a', { text: 'Mine again' });
    mockTimers.tick(10);
    await tick();
    assert.equal(calls.length, 1, 'no saves during a conflict');
    queue.takeTheirs();
    assert.equal(store.getState().doc.nodes.a.props.text, 'Theirs');
    assert.equal(queue.getState().version, 7);
    assert.equal(queue.getState().status, 'saved');
  });

  it('can keep this editor’s version over the other save', async () => {
    const { store, queue, calls } = setup({ debounceMs: 0 });
    store.updateProps('a', { text: 'Mine' });
    mockTimers.tick(0);
    await tick();
    calls[0].resolve({ ok: false, conflict: true, version: 7, document: doc });
    await tick();
    const keeping = queue.keepMine();
    await tick();
    assert.equal(calls[1].input.baseVersion, 7);
    assert.ok('document' in calls[1].input);
    calls[1].resolve({ ok: true, version: 8 });
    await keeping;
    assert.equal(queue.getState().status, 'saved');
  });

  it('keeps a local copy until the save lands', async () => {
    const { store, calls, saved } = setup({ debounceMs: 5000 });
    store.updateProps('a', { text: 'Unsaved' });
    mockTimers.tick(300);
    await tick();
    assert.equal(saved.get('page:1')?.document.nodes.a.props.text, 'Unsaved');
    mockTimers.tick(5000);
    await tick();
    calls[0].resolve({ ok: true, version: 4 });
    await tick();
    mockTimers.tick(300);
    await tick();
    assert.equal(saved.has('page:1'), false);
  });

  it('waits for flush when autosave is off, and holds saves while paused', async () => {
    const store = createEditorStore({ document: doc, schemas });
    const calls: SaveInput[] = [];
    const queue = createSaveQueue({ store, version: 1, autosave: false, save: async input => { calls.push(input); return { ok: true, version: 2 }; } });
    queue.start();
    store.updateProps('a', { text: 'Global change' });
    mockTimers.tick(5000);
    await tick();
    assert.equal(calls.length, 0, 'nothing saved until asked');
    assert.equal(queue.getState().status, 'pending');
    queue.setPaused(true);
    await queue.flush();
    assert.equal(calls.length, 0, 'paused');
    queue.setPaused(false);
    await queue.flush();
    assert.equal(calls.length, 1);
    assert.equal(queue.getState().status, 'saved');
  });
});
