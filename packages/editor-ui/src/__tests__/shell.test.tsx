import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Breadcrumb } from '../shell/Breadcrumb';
import { CommandPalette } from '../shell/CommandPalette';
import { EditorShell } from '../shell/EditorShell';
import { Panel, readPanelState } from '../shell/Panel';
import { StatusBar } from '../shell/StatusBar';
import { LayersTree } from '../tree/LayersTree';

describe('EditorShell slots (B15 E3, G6)', () => {
  it('renders every slot it is given', () => {
    const html = renderToStaticMarkup(
      <EditorShell
        topBar={<div>TOP</div>}
        library={<div>LIB</div>}
        canvas={<div>CANVAS</div>}
        inspector={<div>INSPECT</div>}
        statusBar={<div>STATUS</div>}
        commandPalette={<div>PALETTE</div>}
      />
    );
    for (const slot of [
      'TOP',
      'LIB',
      'CANVAS',
      'INSPECT',
      'STATUS',
      'PALETTE',
    ]) {
      assert.ok(html.includes(slot), `missing ${slot}`);
    }
  });

  it('hides the side slots in focus mode but keeps the canvas', () => {
    const html = renderToStaticMarkup(
      <EditorShell
        focusMode
        library={<div>LIB</div>}
        canvas={<div>CANVAS</div>}
        inspector={<div>INSPECT</div>}
      />
    );
    assert.ok(html.includes('CANVAS'));
    assert.ok(!html.includes('LIB'));
    assert.ok(!html.includes('INSPECT'));
  });

  it('sets theme and direction on the editor root', () => {
    const html = renderToStaticMarkup(
      <EditorShell theme="dark" dir="rtl" canvas={null} />
    );
    assert.match(html, /data-ne-theme="dark"/);
    assert.match(html, /dir="rtl"/);
  });
});

describe('Panel (B15 E3, G5)', () => {
  const fallback = { width: 280, collapsed: false };

  it('falls back when nothing is stored or storage is unavailable', () => {
    assert.deepEqual(readPanelState(undefined, fallback), fallback);
    assert.deepEqual(readPanelState('missing-key', fallback), fallback);
  });

  it('renders a focusable, labelled resize handle with its range', () => {
    const html = renderToStaticMarkup(
      <Panel
        side="left"
        title="Layers"
        defaultWidth={260}
        minWidth={200}
        maxWidth={400}
      >
        body
      </Panel>
    );
    assert.match(html, /role="separator"/);
    assert.match(html, /aria-label="Resize Layers"/);
    assert.match(html, /tabindex="0"/);
    assert.match(html, /aria-valuenow="260"/);
    assert.match(html, /aria-valuemin="200"/);
    assert.match(html, /aria-valuemax="400"/);
  });

  it('uses logical borders so the panel flips in RTL', () => {
    const start = renderToStaticMarkup(<Panel side="left">x</Panel>);
    const end = renderToStaticMarkup(<Panel side="right">x</Panel>);
    assert.match(start, /border-e/);
    assert.match(end, /border-s/);
  });
});

describe('Breadcrumb and StatusBar', () => {
  it('marks the last crumb as the current location', () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ label: 'Page' }, { id: 'hero', label: 'Hero' }]} />
    );
    assert.match(html, /aria-label="Breadcrumb"/);
    assert.match(html, /aria-current="location"[^>]*>Hero/);
  });

  it('renders its three slots', () => {
    const html = renderToStaticMarkup(
      <StatusBar left="L" center="C" right="R" />
    );
    assert.ok(html.includes('L') && html.includes('C') && html.includes('R'));
  });
});

describe('CommandPalette (R712)', () => {
  it('renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      <CommandPalette
        open={false}
        onOpenChange={() => {}}
        items={[{ id: 'a', label: 'Undo', onSelect: () => {} }]}
      />
    );
    assert.equal(html, '');
  });
});

describe('LayersTree semantics (B15 E4, G8)', () => {
  const nodes = [
    {
      id: 'page',
      name: 'Page',
      type: 'root',
      children: [
        { id: 'hero', name: 'Hero', type: 'section' },
        { id: 'footer', name: 'Footer', type: 'section' },
      ],
    },
  ];

  it('exposes a tree with levels, sets and expansion', () => {
    const html = renderToStaticMarkup(
      <LayersTree nodes={nodes} selectedId="hero" onSelect={() => {}} />
    );
    assert.match(html, /role="tree"/);
    assert.match(html, /role="group"/);
    assert.match(
      html,
      /role="treeitem"[^>]*aria-level="1"[^>]*aria-selected="false"[^>]*aria-expanded="true"/
    );
    assert.match(
      html,
      /aria-level="2" aria-setsize="2" aria-posinset="1" aria-selected="true"/
    );
  });

  it('has exactly one tab stop, on the selected row', () => {
    const html = renderToStaticMarkup(
      <LayersTree nodes={nodes} selectedId="hero" onSelect={() => {}} />
    );
    const stops = html.match(/role="treeitem"[^>]*tabindex="0"/g) ?? [];
    assert.equal(stops.length, 1);
    assert.match(stops[0] ?? '', /aria-label="Hero"/);
  });
});
