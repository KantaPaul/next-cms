import assert from 'node:assert';
import { describe, it } from 'node:test';
import { type BuilderDocument, DOCUMENT_VERSION } from '../document';
import { createLoaderRegistry } from '../loaders';

const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {
    'a-1': { id: 'a-1', type: 'Stub', props: { title: 'Hello' }, slots: {} },
    'b-1': { id: 'b-1', type: 'Hero', props: { title: 'Static' }, slots: {} },
    'x-1': { id: 'x-1', type: 'Boom', props: { keep: true }, slots: {} },
  },
  rootSlot: ['a-1', 'b-1', 'x-1'],
};

describe('createLoaderRegistry', () => {
  it('registers, lists, and returns loaders', () => {
    const registry = createLoaderRegistry();
    const stub = async () => ({});
    registry.register('Stub', stub);
    assert.equal(registry.get('Stub'), stub);
    assert.deepEqual(registry.types(), ['Stub']);
    assert.equal(registry.get('Hero'), undefined);
  });

  it('merges patches onto matching nodes and passes the context', async () => {
    const registry = createLoaderRegistry<{ language: string }>({
      Stub: async (props, ctx) => ({ title: `${props.title}:${ctx.language}` }),
    });
    const resolved = await registry.resolve(doc, { language: 'en' });
    assert.equal(resolved.nodes['a-1'].props.title, 'Hello:en');
    assert.equal(resolved.nodes['b-1'].props.title, 'Static');
    assert.equal(doc.nodes['a-1'].props.title, 'Hello', 'input not mutated');
  });

  it('keeps original props and reports the error when a loader throws', async () => {
    const errors: string[] = [];
    const registry = createLoaderRegistry(
      {},
      { onError: (_error, node) => errors.push(node.id) }
    );
    registry.register('Boom', async () => {
      throw new Error('db down');
    });
    const resolved = await registry.resolve(doc, {});
    assert.equal(resolved.nodes['x-1'].props.keep, true);
    assert.deepEqual(errors, ['x-1']);
  });
});

describe('createLoaderRegistry batch loaders (R752)', () => {
  const batchDoc: BuilderDocument = {
    version: DOCUMENT_VERSION,
    root: { props: {} },
    nodes: {
      'r-1': { id: 'r-1', type: 'Ref', props: { refId: 'g1' }, slots: {} },
      'r-2': { id: 'r-2', type: 'Ref', props: { refId: 'g2' }, slots: {} },
      'r-3': { id: 'r-3', type: 'Ref', props: { refId: 'g1' }, slots: {} },
    },
    rootSlot: ['r-1', 'r-2', 'r-3'],
  };

  it('calls a batch loader once for every node of its type, not once per node', async () => {
    let calls = 0;
    const registry = createLoaderRegistry();
    registry.registerBatch('Ref', async nodes => {
      calls += 1;
      return Object.fromEntries(
        nodes.map(n => [n.id, { label: `loaded:${n.props.refId}` }])
      );
    });
    const resolved = await registry.resolve(batchDoc, {});
    assert.equal(calls, 1);
    assert.equal(resolved.nodes['r-1'].props.label, 'loaded:g1');
    assert.equal(resolved.nodes['r-2'].props.label, 'loaded:g2');
    assert.equal(resolved.nodes['r-3'].props.label, 'loaded:g1');
  });

  it('lets a batch loader fetch each distinct value once (one query per distinct id)', async () => {
    const queried: string[] = [];
    const registry = createLoaderRegistry();
    registry.registerBatch('Ref', async nodes => {
      const distinct = [...new Set(nodes.map(n => n.props.refId as string))];
      const byId = Object.fromEntries(
        await Promise.all(
          distinct.map(async id => {
            queried.push(id);
            return [id, { name: `Block ${id}` }] as const;
          })
        )
      );
      return Object.fromEntries(
        nodes.map(n => [n.id, byId[n.props.refId as string]])
      );
    });
    const resolved = await registry.resolve(batchDoc, {});
    assert.deepEqual(queried.sort(), ['g1', 'g2']);
    assert.equal(resolved.nodes['r-3'].props.name, 'Block g1');
  });

  it('reports a batch loader error against the group without dropping other types', async () => {
    const errors: string[] = [];
    const registry = createLoaderRegistry(
      { Stub: async props => ({ title: `${props.title}!` }) },
      { onError: (_error, node) => errors.push(node.id) }
    );
    registry.registerBatch('Ref', async () => {
      throw new Error('db down');
    });
    const mixed: BuilderDocument = {
      ...batchDoc,
      nodes: {
        ...batchDoc.nodes,
        s1: { id: 's1', type: 'Stub', props: { title: 'Hi' }, slots: {} },
      },
      rootSlot: [...batchDoc.rootSlot, 's1'],
    };
    const resolved = await registry.resolve(mixed, {});
    assert.deepEqual(errors, ['r-1']);
    assert.equal(resolved.nodes.s1.props.title, 'Hi!');
    assert.equal(
      resolved.nodes['r-2'].props.refId,
      'g2',
      'untouched on failure'
    );
  });
});
