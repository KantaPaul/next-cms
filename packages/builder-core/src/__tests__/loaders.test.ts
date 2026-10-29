import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';
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
