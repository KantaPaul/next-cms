import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';
import {
  renderDocument,
  renderNodes,
  type BlockComponents,
  type SlotRender,
} from '../renderer';

const components: BlockComponents = {
  Text: ({ text, editing }) => <p data-editing={String(editing)}>{String(text)}</p>,
  Box: ({ content, id }) => (
    <section data-id={String(id)}>{(content as SlotRender)({ className: 'inner' })}</section>
  ),
  Tabs: ({ items }) => (
    <ul>
      {(items as { label: string; content: SlotRender }[]).map(item => (
        <li key={item.label}>
          {item.label}
          {item.content()}
        </li>
      ))}
    </ul>
  ),
};

const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {
    box: { id: 'box', type: 'Box', props: { id: 'box' }, slots: { content: ['t1', 'missing', 'u1'] } },
    t1: { id: 't1', type: 'Text', props: { text: 'Hi' }, slots: {} },
    u1: { id: 'u1', type: 'Unknown', props: {}, slots: {} },
    tabs: {
      id: 'tabs',
      type: 'Tabs',
      props: { items: [{ label: 'One' }, { label: 'Two' }] },
      slots: { 'items[0].content': ['t2'], 'items[1].content': [] },
    },
    t2: { id: 't2', type: 'Text', props: { text: 'Tab' }, slots: {} },
  },
  rootSlot: ['box', 'tabs'],
};

describe('renderDocument', () => {
  it('renders slots as functions in a wrapper div and skips unknown nodes', () => {
    const html = renderToStaticMarkup(renderDocument(doc, { components }));
    assert.equal(
      html,
      '<section data-id="undefined"><div class="inner"><p data-editing="false">Hi</p></div></section>' +
        '<ul><li>One<div><p data-editing="false">Tab</p></div></li><li>Two<div></div></li></ul>'
    );
  });

  it('passes editing and applies transformProps', () => {
    const html = renderToStaticMarkup(
      renderNodes(doc, ['t1'], {
        components,
        editing: true,
        transformProps: (_node, props) => ({ ...props, text: 'Changed' }),
      })
    );
    assert.equal(html, '<p data-editing="true">Changed</p>');
  });
});
