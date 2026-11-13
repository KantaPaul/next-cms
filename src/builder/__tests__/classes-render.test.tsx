/**
 * Style classes on rendered blocks (KRK-01, step 1.5).
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/classes-render.test.tsx
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { type BuilderDocument, type BuilderNode, DOCUMENT_VERSION } from '@nextcms/builder-core';
import { NATIVE_BLOCKS } from '../definitions/native';
import { applyStyleClasses, BuilderRenderer, renderDocumentWithLoaders } from '../renderer';
import { STYLE_CLASS_BLOCK_TYPES, supportsStyleClasses } from '../style-class-blocks';

const CLASSES = { k: { name: 'test' }, combo: { name: 'is-large' } };

/** Props a block needs to render anything at all on the public site. */
const NEEDS: Record<string, Record<string, unknown>> = {
  Image: { url: 'https://example.com/a.jpg', alt: 'A' },
};

function docWith(node: Omit<BuilderNode, 'slots'> & { slots?: BuilderNode['slots'] }, extra: BuilderNode[] = []): BuilderDocument {
  const nodes: Record<string, BuilderNode> = { [node.id]: { slots: {}, ...node } };
  for (const n of extra) nodes[n.id] = n;
  return { version: DOCUMENT_VERSION, root: { props: {} }, rootSlot: [node.id], nodes };
}

function defaults(type: string): Record<string, unknown> {
  const def = NATIVE_BLOCKS.find(b => b.type === type) as { defaultProps?: Record<string, unknown> } | undefined;
  return { ...(def?.defaultProps ?? {}), ...NEEDS[type] };
}

const render = (doc: BuilderDocument, classes: Record<string, { name: string }> = CLASSES) =>
  renderToStaticMarkup(createElement(BuilderRenderer, { document: doc, metadata: { classes } }));

describe('style classes on rendered blocks (KRK-01)', () => {
  for (const type of STYLE_CLASS_BLOCK_TYPES) {
    it(`${type} renders its classes`, () => {
      const doc =
        type === 'Column'
          ? docWith(
              { id: 'cols', type: 'Columns', props: defaults('Columns'), slots: { columns: ['n'] } },
              [{ id: 'n', type: 'Column', props: { classIds: ['k'] }, slots: { content: [] } }]
            )
          : docWith({ id: 'n', type, props: { ...defaults(type), classIds: ['k'] } });
      assert.match(render(doc), /class="[^"]*\bc-test\b/);
    });
  }

  it('lists only real block types', () => {
    const known = new Set(NATIVE_BLOCKS.map(b => b.type));
    assert.deepEqual(STYLE_CLASS_BLOCK_TYPES.filter(t => !known.has(t)), []);
    assert.ok(supportsStyleClasses('Heading'));
    assert.ok(!supportsStyleClasses('GlobalRef'));
  });

  it('puts a Container class on its layout element, not the outer wrapper', () => {
    const html = render(docWith({ id: 'n', type: 'Container', props: { ...defaults('Container'), classIds: ['k'] } }));
    assert.equal(html.match(/c-test/g)?.length, 1);
    assert.match(html, /class="[^"]*\bs-cntr\b[^"]*\bc-test\b/);
  });

  it('renders base and combo classes together, in order', () => {
    const html = render(docWith({ id: 'n', type: 'Heading', props: { ...defaults('Heading'), classIds: ['k', 'combo'] } }));
    assert.match(html, /c-test c-is-large/);
  });

  it('skips unknown ids and unsafe names', () => {
    const html = render(
      docWith({ id: 'n', type: 'Heading', props: { ...defaults('Heading'), classIds: ['gone', 'bad', 'k'] } }),
      { k: { name: 'test' }, bad: { name: 'x" onclick="y' } }
    );
    assert.match(html, /\bc-test\b/);
    assert.doesNotMatch(html, /onclick|c-gone/);
  });

  it('applies classes to blocks with their own transform branch (ContactForm)', () => {
    const props = applyStyleClasses({ classIds: ['k'], section: { paddingY: 'sm' } }, CLASSES);
    assert.equal(props.styleClassName, 'c-test');
    assert.deepEqual(props.section, { paddingY: 'sm', styleClassName: 'c-test' });
    const html = render(docWith({ id: 'n', type: 'ContactForm', props: { ...defaults('ContactForm'), classIds: ['k'] } }));
    assert.match(html, /\bc-test\b/);
  });

  it('leaves props untouched without classes', () => {
    const props = { section: { paddingY: 'sm' } };
    assert.equal(applyStyleClasses(props, CLASSES), props);
    assert.equal(applyStyleClasses({ classIds: ['k'] }, undefined).styleClassName, undefined);
  });
});

describe('class CSS on rendered pages (KRK-01)', () => {
  it('emits the loaded CSS and resolves names from the loader', async () => {
    let asked: string[] = [];
    const doc = docWith({ id: 'n', type: 'Heading', props: { ...defaults('Heading'), classIds: ['k'] } });
    const node = await renderDocumentWithLoaders(doc, {}, {}, 'page', {
      loadStyleClasses: async ids => {
        asked = [...ids];
        return { classes: { k: { name: 'test' } }, css: '.site-root .c-test{color:#f00;}' };
      },
    });
    const html = renderToStaticMarkup(node as never);
    assert.deepEqual(asked, ['k']);
    assert.match(html, /<style data-style-classes="">\.site-root \.c-test\{color:#f00;\}<\/style>/);
    assert.match(html, /class="[^"]*\bc-test\b/);
  });

  it('does not call the loader or add a style tag when no block uses a class', async () => {
    const doc = docWith({ id: 'n', type: 'Heading', props: defaults('Heading') });
    let called = false;
    const withLoader = renderToStaticMarkup(
      (await renderDocumentWithLoaders(doc, {}, {}, 'page', {
        loadStyleClasses: async () => {
          called = true;
          return { classes: {}, css: '' };
        },
      })) as never
    );
    const without = renderToStaticMarkup((await renderDocumentWithLoaders(doc)) as never);
    assert.equal(called, false);
    assert.equal(withLoader, without);
  });

  it('still renders the page when loading classes fails', async () => {
    const doc = docWith({ id: 'n', type: 'Heading', props: { ...defaults('Heading'), classIds: ['k'] } });
    const original = console.error;
    console.error = () => {};
    try {
      const html = renderToStaticMarkup(
        (await renderDocumentWithLoaders(doc, {}, {}, 'page', {
          loadStyleClasses: async () => {
            throw new Error('db down');
          },
        })) as never
      );
      assert.doesNotMatch(html, /data-style-classes/);
      assert.ok(html.length > 0);
    } finally {
      console.error = original;
    }
  });
});
