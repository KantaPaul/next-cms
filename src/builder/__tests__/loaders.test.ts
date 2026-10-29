/**
 * Unit tests for server data loaders (R685).
 * Run with: npx tsx --test src/builder/__tests__/loaders.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getBlockLoader,
  listLoaderTypes,
  registerBlockLoader,
  resolveDocumentData,
  type BlockLoader,
} from '../loaders';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';

describe('loader registry', () => {
  it('registers the built-in types that currently use resolveData',
    () => {
      const types = listLoaderTypes();
      assert.ok(types.includes('BlogPosts'));
      assert.ok(types.includes('RelatedPosts'));
      assert.ok(types.includes('GlobalRef'));
      assert.ok(types.includes('VideoLibrary'));
      assert.equal(typeof getBlockLoader('BlogPosts'), 'function');
      assert.equal(getBlockLoader('Hero'), undefined);
    });

  it('allows hosts to register additional loaders',
    () => {
      const custom: BlockLoader = async () => ({ extra: true });
      registerBlockLoader('QueryLoop', custom);
      assert.equal(getBlockLoader('QueryLoop'), custom);
      assert.ok(listLoaderTypes().includes('QueryLoop'));
    });
});

describe('resolveDocumentData', () => {
  it('merges loader patches onto matching nodes only',
    async () => {
      registerBlockLoader('Stub', async props => ({
        loaded: true,
        title: `loaded:${props.title}`,
      }));

      const doc: BuilderDocument = {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        nodes: {
          'a-1': {
            id: 'a-1',
            type: 'Stub',
            props: { id: 'a-1', title: 'Hello' },
            slots: {},
          },
          'b-1': {
            id: 'b-1',
            type: 'Hero',
            props: { id: 'b-1', title: 'Static' },
            slots: {},
          },
        },
        rootSlot: ['a-1', 'b-1'],
      };

      const resolved = await resolveDocumentData(doc, {});
      assert.equal(resolved.nodes['a-1'].props.loaded, true);
      assert.equal(resolved.nodes['a-1'].props.title, 'loaded:Hello');
      assert.equal(resolved.nodes['b-1'].props.title, 'Static');
      assert.equal(resolved.nodes['b-1'].props.loaded, undefined);
      // Original document is not mutated
      assert.equal(doc.nodes['a-1'].props.loaded, undefined);
    });

  it('keeps original props when a loader throws',
    async () => {
      registerBlockLoader('Boom', async () => {
        throw new Error('db down');
      });

      const doc: BuilderDocument = {
        version: DOCUMENT_VERSION,
        root: { props: {} },
        nodes: {
          'x-1': {
            id: 'x-1',
            type: 'Boom',
            props: { id: 'x-1', keep: true },
            slots: {},
          },
        },
        rootSlot: ['x-1'],
      };

      const resolved = await resolveDocumentData(doc, {});
      assert.equal(resolved.nodes['x-1'].props.keep, true);
    });

  it('returns the same reference shape for an empty document',
    async () => {
      const doc: BuilderDocument = {
        version: DOCUMENT_VERSION,
        root: { props: { maxWidth: 'xl' } },
        nodes: {},
        rootSlot: [],
      };
      const resolved = await resolveDocumentData(doc, { language: 'en' });
      assert.deepEqual(resolved.rootSlot, []);
      assert.deepEqual(resolved.root.props, { maxWidth: 'xl' });
    });
});
