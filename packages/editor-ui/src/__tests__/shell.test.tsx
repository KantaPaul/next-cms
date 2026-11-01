import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Breadcrumb } from '../shell/Breadcrumb';
import { CommandPalette } from '../shell/CommandPalette';
import { EditorShell } from '../shell/EditorShell';
import { Panel, readPanelState } from '../shell/Panel';
import { StatusBar } from '../shell/StatusBar';
import { TopBar } from '../shell/TopBar';
import { FloatingDeviceBar } from '../shell/FloatingDeviceBar';
import {
  SHORTCUT_GROUPS,
  ShortcutHelpDialog,
  filterShortcutGroups,
} from '../shell/ShortcutHelpDialog';
import { LayersTree } from '../tree/LayersTree';

describe('EditorShell slots (B15 E3, G6)', () => {
  it('renders every slot it is given', () => {
    const html = renderToStaticMarkup(
      <EditorShell
        topBar={<div>TOP</div>}
        notices={<div>NOTICE</div>}
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

describe('TopBar primary action', () => {
  it('uses the given label and disabled state', () => {
    const html = renderToStaticMarkup(
      <TopBar
        title="Home"
        saveStatus="saved"
        onPublish={() => {}}
        publishLabel="Update live page"
        publishDisabled
      />
    );
    assert.match(html, /<button[^>]*disabled[^>]*>.*Update live page/);
  });

  it('defaults to Publish and hides it without a handler', () => {
    assert.match(
      renderToStaticMarkup(
        <TopBar title="Home" saveStatus="saved" onPublish={() => {}} />
      ),
      /Publish/
    );
    assert.doesNotMatch(
      renderToStaticMarkup(<TopBar title="Home" saveStatus="saved" />),
      /Publish/
    );
  });
});

describe('TopBar layout and dock', () => {
  it('shows the Panel/Split switch and the dock toggle in single layout', () => {
    const html = renderToStaticMarkup(
      <TopBar
        title="Home"
        saveStatus="saved"
        layout="single"
        onLayoutChange={() => {}}
        dockSide="right"
        onDockSideChange={() => {}}
      />
    );
    assert.match(html, /aria-pressed="true"[^>]*>.*Panel/);
    assert.match(html, /Split/);
    assert.match(html, /aria-label="Dock panel to left"/);
  });

  it('hides the dock toggle in split layout', () => {
    const html = renderToStaticMarkup(
      <TopBar
        title="Home"
        saveStatus="saved"
        layout="split"
        onLayoutChange={() => {}}
        onDockSideChange={() => {}}
      />
    );
    assert.doesNotMatch(html, /Dock panel to/);
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

describe('FloatingDeviceBar (Phase 2 Canvas Controls)', () => {
  it('renders device options and zoom controls', () => {
    const html = renderToStaticMarkup(
      <FloatingDeviceBar
        device="desktop"
        onDeviceChange={() => {}}
        zoom={100}
        onZoomChange={() => {}}
      />
    );
    assert.match(html, /role="toolbar"/);
    assert.match(html, /aria-label="Desktop view"/);
    assert.match(html, /aria-label="Tablet view"/);
    assert.match(html, /aria-label="Mobile view"/);
    assert.match(html, /100%/);
    assert.match(html, /aria-label="Zoom in"/);
    assert.match(html, /aria-label="Zoom out"/);
  });
});

describe('ShortcutHelpDialog (Phase 5 Searchable Shortcuts)', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <ShortcutHelpDialog open={false} onClose={() => {}} />
    );
    assert.equal(html, '');
  });

  it('contains categorized shortcuts for editing, canvas, and animation', () => {
    assert.ok(SHORTCUT_GROUPS.length >= 3);
    const allLabels = SHORTCUT_GROUPS.flatMap(g => g.items.map(i => i.label));
    assert.ok(allLabels.includes('Save document'));
    assert.ok(allLabels.includes('Animation view'));
    assert.ok(allLabels.includes('Copy style'));
    assert.ok(allLabels.includes('Paste style'));
    assert.ok(allLabels.includes('Inspect block'));
  });

  it('filters shortcut items by query matching label, category, or keys', () => {
    const animMatches = filterShortcutGroups(SHORTCUT_GROUPS, 'animation');
    assert.equal(animMatches.length, 1);
    assert.equal(animMatches[0]?.items[0]?.label, 'Animation view');

    const styleMatches = filterShortcutGroups(SHORTCUT_GROUPS, 'style');
    assert.equal(styleMatches.length, 1);
    assert.equal(styleMatches[0]?.items.length, 2); // copy style and paste style

    const emptyMatches = filterShortcutGroups(SHORTCUT_GROUPS, 'nonexistentquery12345');
    assert.equal(emptyMatches.length, 0);
  });
});
