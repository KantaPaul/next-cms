import assert from 'node:assert';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { createNode } from '../blocks';
import { defineBlock } from '../define';
import { DOCUMENT_VERSION, emptyDocument } from '../document';
import {
  createBuilderConfig,
  type DocumentMigration,
  deserializeDocument,
  documentMigrations,
  migrateDocument,
  serializeDocument,
  validateDocument,
} from '../public-api';

const Hero = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'Marketing',
  schema: z.object({ title: z.string().default('Hi') }),
  render: () => null as never,
});

const Text = defineBlock({
  type: 'Text',
  label: 'Text',
  category: 'Content',
  schema: z.object({ value: z.string().default('') }),
  render: () => null as never,
});

describe('createBuilderConfig (R758)', () => {
  it('builds schemas, components, and groups from a block list', () => {
    const config = createBuilderConfig({ blocks: [Hero, Text] });
    assert.deepEqual(Object.keys(config.schemas), ['Hero', 'Text']);
    assert.equal(typeof config.components.Hero, 'function');
    assert.deepEqual(config.groups, [
      { title: 'Marketing', types: ['Hero'] },
      { title: 'Content', types: ['Text'] },
    ]);
    assert.equal(config.blocks.Hero, Hero);
  });

  it('groups blocks without a category under "Blocks"', () => {
    const NoCategory = defineBlock({
      type: 'Spacer',
      label: 'Spacer',
      schema: z.object({}),
      render: () => null as never,
    });
    const config = createBuilderConfig({ blocks: [NoCategory] });
    assert.deepEqual(config.groups, [{ title: 'Blocks', types: ['Spacer'] }]);
  });

  it('produces schemas usable with createNode, same as the editor store would', () => {
    const config = createBuilderConfig({ blocks: [Hero] });
    const node = createNode(config.schemas.Hero, 'hero-1');
    assert.equal(node.props.title, 'Hi');
  });
});

describe('validateDocument / migrateDocument / serializeDocument (R762)', () => {
  it('accepts a well-formed document unchanged', () => {
    const doc = emptyDocument();
    const result = validateDocument(doc);
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.document === doc);
  });

  it('rejects a document with structural problems', () => {
    const doc = { ...emptyDocument(), rootSlot: ['missing'] };
    const result = validateDocument(doc);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues.length > 0);
  });

  it('rejects values that are not a document at all', () => {
    const result = validateDocument({ nope: true });
    assert.equal(result.ok, false);
  });

  it('converts legacy Puck data', () => {
    const puck = {
      root: { props: {} },
      content: [{ type: 'Hero', props: { id: 'a' } }],
    };
    const result = validateDocument(puck);
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.document.version === DOCUMENT_VERSION);
  });

  it('migrateDocument converts legacy Puck data too', () => {
    const puck = {
      root: { props: {} },
      content: [{ type: 'Hero', props: { id: 'a' } }],
    };
    const doc = migrateDocument(puck);
    assert.equal(doc.version, DOCUMENT_VERSION);
  });

  it('migrateDocument steps through registered migrations', () => {
    const before: DocumentMigration = old => ({
      ...old,
      version: (old.version as number) + 1,
      upgraded: true,
    });
    documentMigrations[0] = before;
    try {
      const doc = migrateDocument({
        version: 0,
        root: { props: {} },
        nodes: {},
        rootSlot: [],
      });
      assert.equal(doc.version, DOCUMENT_VERSION);
    } finally {
      delete documentMigrations[0];
    }
  });

  it('migrateDocument falls back to an empty document for junk input', () => {
    const doc = migrateDocument('not a document');
    assert.deepEqual(doc, emptyDocument());
  });

  it('round-trips through serializeDocument and deserializeDocument', () => {
    const doc = emptyDocument();
    const json = serializeDocument(doc);
    const result = deserializeDocument(json);
    assert.equal(result.ok, true);
    assert.ok(result.ok && result.document.version === DOCUMENT_VERSION);
  });

  it('deserializeDocument reports invalid JSON instead of throwing', () => {
    const result = deserializeDocument('{not json');
    assert.equal(result.ok, false);
  });
});
