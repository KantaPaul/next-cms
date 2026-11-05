import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RollingNumber,
  flipDelta,
  indicatorVars,
  measureIndicator,
  resolveMotionLevel,
  rollDirection,
  rollSlots,
} from '../lib/motion';
import { Tabs } from '../primitives/Tabs';
import { EditorShell } from '../shell/EditorShell';
import { FloatingDeviceBar } from '../shell/FloatingDeviceBar';

describe('sliding indicator', () => {
  it('measures the layout box and maps it to CSS variables', () => {
    const box = measureIndicator({
      offsetLeft: 42,
      offsetTop: 2,
      offsetWidth: 80,
      offsetHeight: 24,
    });
    assert.deepStrictEqual(box, { x: 42, y: 2, w: 80, h: 24 });
    assert.deepStrictEqual(indicatorVars(box), {
      '--ne-ind-x': '42px',
      '--ne-ind-y': '2px',
      '--ne-ind-w': '80px',
      '--ne-ind-h': '24px',
    });
  });

  it('renders one indicator before the items and marks the active item', () => {
    const html = renderToStaticMarkup(
      <Tabs
        items={[
          { id: 'content', label: 'Content' },
          { id: 'style', label: 'Style' },
        ]}
        activeId="style"
        onChange={() => {}}
      />
    );
    assert.match(html, /role="tablist"[^>]*><span aria-hidden="true" class="ne-indicator"><\/span><button/);
    assert.strictEqual(html.match(/data-ne-active="true"/g)?.length, 1);
    assert.match(html, /data-ne-active="true"[^>]*>(<span[^>]*>)?<span class="truncate">Style/);
  });

  it('puts the device bar pill on the active device', () => {
    const html = renderToStaticMarkup(
      <FloatingDeviceBar device="tablet" onDeviceChange={() => {}} />
    );
    assert.strictEqual(html.match(/class="ne-indicator"/g)?.length, 1);
    assert.match(html, /aria-label="Tablet view"[^>]*data-ne-active="true"/);
  });
});

describe('RollingNumber', () => {
  it('aligns characters from the right so units stay put', () => {
    assert.deepStrictEqual(rollSlots('9%', '10%'), [
      { key: '3', from: ' ', to: '1' },
      { key: '2', from: '9', to: '0' },
      { key: '1', from: '%', to: '%' },
    ]);
  });

  it('drops slots that only the old value had', () => {
    assert.deepStrictEqual(
      rollSlots('100', '90').map(s => s.to),
      ['9', '0']
    );
  });

  it('rolls down for smaller numbers and up otherwise', () => {
    assert.strictEqual(rollDirection('100', '90'), 'down');
    assert.strictEqual(rollDirection('90%', '100%'), 'up');
    assert.strictEqual(rollDirection('a', 'b'), 'up');
  });

  it('renders the value as text and hides the visual digits', () => {
    const html = renderToStaticMarkup(<RollingNumber value="100%" />);
    assert.match(html, /<span class="sr-only">100%<\/span>/);
    assert.match(html, /aria-hidden="true"/);
    const digits = [...html.matchAll(/class="ne-roll-slot">([^<]*)</g)].map(
      m => m[1]
    );
    assert.deepStrictEqual(digits, ['1', '0', '0', '%']);
  });
});

describe('useFlip delta', () => {
  it('inverts a moved child', () => {
    assert.deepStrictEqual(
      flipDelta({ left: 0, top: 40 }, { left: 0, top: 0 }),
      { dx: 0, dy: 40 }
    );
  });

  it('ignores new children and sub-pixel moves', () => {
    assert.strictEqual(flipDelta(undefined, { left: 0, top: 0 }), null);
    assert.strictEqual(
      flipDelta({ left: 0.2, top: 0.3 }, { left: 0, top: 0 }),
      null
    );
  });
});

describe('motion level', () => {
  it('defaults to full and honours the old reducedMotion flag', () => {
    assert.strictEqual(resolveMotionLevel(null), 'full');
    assert.strictEqual(resolveMotionLevel({ motion: 'subtle' }), 'subtle');
    assert.strictEqual(resolveMotionLevel({ motion: 'nope' }), 'full');
    assert.strictEqual(
      resolveMotionLevel({ motion: 'full', reducedMotion: true }),
      'off'
    );
  });

  it('is set on the editor root', () => {
    const html = renderToStaticMarkup(
      <EditorShell canvas={<div />} motion="subtle" />
    );
    assert.match(html, /data-ne-motion="subtle"/);
  });
});

describe('top bar motion', () => {
  it('parses CSS time tokens', async () => {
    const { parseCssTime } = await import('../lib/motion');
    assert.strictEqual(parseCssTime('200ms'), 200);
    assert.strictEqual(parseCssTime(' 0.32s'), 320);
    assert.strictEqual(parseCssTime('0ms'), 0);
    assert.strictEqual(parseCssTime(''), 0);
  });

  it('shows progress on the primary action while publishing', async () => {
    const { TopBar } = await import('../shell/TopBar');
    const html = renderToStaticMarkup(
      <TopBar
        title="Home"
        saveStatus="saved"
        onPublish={() => {}}
        publishLabel="Update live page"
        publishState="publishing"
      />
    );
    assert.match(html, /data-publish-state="publishing"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /animate-spin/);
    assert.match(html, /Update live page/);
  });

  it('stays idle by default and keeps both theme icons mounted', async () => {
    const { TopBar } = await import('../shell/TopBar');
    const html = renderToStaticMarkup(
      <TopBar
        title="Home"
        saveStatus="saving"
        onPublish={() => {}}
        onToggleTheme={() => {}}
        isDark
      />
    );
    assert.match(html, /data-publish-state="idle"/);
    assert.doesNotMatch(html, /aria-busy/);
    assert.match(html, /class="ne-swap" data-on="b"/);
    assert.match(html, /lucide-moon/);
    assert.match(html, /lucide-sun/);
    assert.match(html, /class="ne-save-pulse"/);
  });
});

describe('device bar motion', () => {
  it('steps zoom by 10 inside 50–150', async () => {
    const { stepZoom } = await import('../shell/FloatingDeviceBar');
    assert.strictEqual(stepZoom(100, 1), 110);
    assert.strictEqual(stepZoom(100, -1), 90);
    assert.strictEqual(stepZoom(150, 1), 150);
    assert.strictEqual(stepZoom(55, -1), 50);
  });

  it('rolls the zoom value and disables steppers at the limits', () => {
    const html = renderToStaticMarkup(
      <FloatingDeviceBar
        device="mobile"
        onDeviceChange={() => {}}
        zoom={150}
        onZoomChange={() => {}}
      />
    );
    assert.match(html, /class="ne-roll"/);
    assert.match(html, /<span class="sr-only">150%<\/span>/);
    assert.match(html, /disabled=""[^>]*aria-label="Zoom in"/);
    assert.doesNotMatch(html, /disabled=""[^>]*aria-label="Zoom out"/);
    assert.match(html, /aria-label="Mobile view"[^>]*>[^]*?ne-motion-pop-in/);
  });
});

describe('inspector motion', () => {
  it('keeps the changed dot mounted and toggles it by state', async () => {
    const { ChangedDot } = await import('../inspector/ChangedDot');
    const off = renderToStaticMarkup(<ChangedDot />);
    const on = renderToStaticMarkup(<ChangedDot changed />);
    assert.match(off, /class="ne-changed-dot[^"]*"/);
    assert.match(off, /data-on="false"/);
    assert.match(off, /aria-hidden="true"/);
    assert.match(on, /data-on="true"/);
    assert.match(on, /title="Modified from default"/);
  });

  it('slides one indicator under the selected panel tab', async () => {
    const { PanelTabs } = await import('../shell/PanelTabs');
    const tabs = [
      { id: 'content', label: 'Content' },
      { id: 'style', label: 'Style' },
    ];
    const seg = renderToStaticMarkup(
      <PanelTabs tabs={tabs} activeTab="style" onChange={() => {}} variant="segmented" />
    );
    assert.strictEqual(seg.match(/class="ne-indicator"/g)?.length, 1);
    assert.match(seg, /aria-selected="true"[^>]*data-ne-active="true"/);
    const line = renderToStaticMarkup(
      <PanelTabs tabs={tabs} activeTab="content" onChange={() => {}} />
    );
    assert.match(line, /class="ne-indicator ne-indicator-line"/);
  });

  it('rolls section and filter counts', async () => {
    const { FieldGroup } = await import('../inspector/FieldGroup');
    const { ChangedFilter } = await import('../inspector/SettingsSearch');
    const group = renderToStaticMarkup(
      <FieldGroup title="Content" changedCount={9} expanded>
        <div />
      </FieldGroup>
    );
    assert.match(group, /<span class="sr-only">9<\/span>/);
    const filter = renderToStaticMarkup(
      <ChangedFilter checked={false} onChange={() => {}} changedTotal={14} />
    );
    assert.match(filter, /<span class="sr-only">14<\/span>/);
  });

  it('marks the selected choose option for the indicator', async () => {
    const { ChooseField } = await import('../controls/ChooseField');
    const html = renderToStaticMarkup(
      <ChooseField
        label="Align"
        value="center"
        onChange={() => {}}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
        ]}
      />
    );
    assert.match(html, /role="radiogroup"[^>]*><span aria-hidden="true" class="ne-indicator"><\/span>/);
    assert.match(html, /aria-checked="true"[^>]*data-ne-active="true"/);
  });
});

describe('other chrome motion', () => {
  it('measures a nested item relative to the container', () => {
    const container = { offsetLeft: 0, offsetTop: 0, offsetWidth: 300, offsetHeight: 200 };
    const wrapper = { offsetLeft: 6, offsetTop: 40, offsetWidth: 280, offsetHeight: 60, offsetParent: container };
    const item = { offsetLeft: 0, offsetTop: 24, offsetWidth: 280, offsetHeight: 30, offsetParent: wrapper };
    assert.deepStrictEqual(measureIndicator(item, container), { x: 6, y: 64, w: 280, h: 30 });
  });

  it('slides one highlight per tool rail group and rolls badges', async () => {
    const { ToolRail } = await import('../shell/ToolRail');
    const { EditorUIProvider } = await import('../theme/EditorUIProvider');
    const html = renderToStaticMarkup(
      <EditorUIProvider>
        <ToolRail
          orientation="horizontal"
          activeId="layers"
          items={[
            { id: 'blocks', label: 'Blocks', icon: <span />, onClick: () => {} },
            { id: 'layers', label: 'Layers', icon: <span />, onClick: () => {}, badge: 3 },
          ]}
        />
      </EditorUIProvider>
    );
    assert.strictEqual(html.match(/class="ne-indicator"/g)?.length, 1);
    assert.match(html, /aria-label="Layers"[^>]*data-ne-active="true"/);
    assert.match(html, /<span class="sr-only">3<\/span>/);
  });
});
