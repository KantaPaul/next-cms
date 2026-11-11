/**
 * Tests for the redesigned Container inspector controls:
 * presets, linked gap, per-field size units, context-aware flex-item visibility,
 * and hidden legacy styles notice.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/container-panel.test.tsx
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applyContainerPreset,
  CONTAINER_PRESETS,
  ContainerFlexControl,
  ContainerLegacyNotice,
  ContainerSizeControl,
  detectContainerPreset,
  getLegacySectionStyleLabels,
  LinkedGapInput,
  linkedGapPatch,
  stepTrackList,
  toggleGapLinkPatch,
  unlinkedGapPatch,
} from '../controls/container';
import { EditorBridgeProvider } from '../controls/editor-bridge';
import { DeviceRow, getDeviceListItems } from '../controls/device-row';
import {
  type ContainerSettings,
  normalizeContainerSettings,
  resolveContainerStyle,
} from '../style';

describe('Container presets', () => {
  it('applies each preset patch and preserves other devices', () => {
    const existing: ContainerSettings = {
      tag: 'section',
      direction: { desktop: 'row', mobile: 'column-reverse' },
      gridTemplateColumns: { desktop: '1fr', mobile: '1fr' },
      gridTemplateRows: { desktop: '1fr 1fr', mobile: 'auto' },
      gap: { desktop: 8, tablet: 12 },
      columnGap: { desktop: 10 },
      rowGap: { desktop: 14 },
    };

    for (const preset of CONTAINER_PRESETS) {
      const next = applyContainerPreset(existing, preset.id, 'desktop');
      assert.equal(next.tag, 'section');
      assert.equal(next.columnGap, undefined, `${preset.id} clears columnGap`);
      assert.equal(next.rowGap, undefined, `${preset.id} clears rowGap`);
      assert.equal(next.gap?.tablet, 12, `${preset.id} keeps tablet gap`);
      assert.equal(next.gapUnit, 'px');
      assert.equal(
        detectContainerPreset(next, 'desktop'),
        preset.id,
        `${preset.id} is detected on desktop`
      );

      if (next.mode === 'flex') {
        assert.equal(
          next.direction?.mobile,
          'column-reverse',
          `${preset.id} keeps mobile direction`
        );
      } else {
        assert.equal(
          next.gridTemplateColumns?.mobile,
          '1fr',
          `${preset.id} keeps mobile gridTemplateColumns`
        );
        assert.equal(
          next.gridTemplateRows?.mobile,
          'auto',
          `${preset.id} keeps mobile gridTemplateRows`
        );
      }
    }

    const row = applyContainerPreset(existing, 'row', 'tablet');
    assert.equal(row.direction?.desktop, 'row');
    assert.equal(row.direction?.tablet, 'row');
    assert.equal(row.direction?.mobile, 'column-reverse');
    assert.equal(row.gap?.desktop, 8);
    assert.equal(row.gap?.tablet, 16);
  });
});

describe('Per-field Container size units', () => {
  it('resolves per-field units and falls back to sizeUnit when unset', () => {
    const input: ContainerSettings = {
      sizeUnit: '%',
      width: { desktop: 50 },
      height: { desktop: 100 },
      heightUnit: 'vh',
      minHeight: { desktop: 10 },
      minHeightUnit: 'rem',
      maxWidth: { desktop: 80 },
    };

    const normalized = normalizeContainerSettings(input);
    assert.equal(normalized.widthUnit, undefined);
    assert.equal(normalized.heightUnit, 'vh');
    assert.equal(normalized.minHeightUnit, 'rem');
    assert.equal(normalized.sizeUnit, '%');

    const { style } = resolveContainerStyle(normalized, 'desktop');
    const s = style as Record<string, string>;
    assert.equal(s['--s-c-w-d'], '50%');
    assert.equal(s['--s-c-xw-d'], '80%');
    assert.equal(s['--s-c-h-d'], '100vh');
    assert.equal(s['--s-c-nh-d'], '10rem');
  });

  it('clamps per-field values using each field own unit limits', () => {
    const normalized = normalizeContainerSettings({
      sizeUnit: 'rem',
      width: { desktop: 50 },
      widthUnit: 'px',
      height: { desktop: 100 },
      heightUnit: 'vh',
    });
    assert.equal(normalized.width?.desktop, 50);
    assert.equal(normalized.height?.desktop, 100);
  });
});

describe('Context-aware Container controls', () => {
  it('shows As a flex item only when parent is a flex Container on active device', () => {
    const flexParentHtml = renderToStaticMarkup(
      <EditorBridgeProvider
        value={{
          device: 'desktop',
          setDevice: () => {},
          parentType: 'Container',
          parentProps: { container: { mode: 'flex' } },
        }}
      >
        <ContainerSizeControl value={{}} onChange={() => {}} />
      </EditorBridgeProvider>
    );
    assert.match(flexParentHtml, /As a flex item/);
    assert.match(flexParentHtml, /Flex grow/);

    const gridParentHtml = renderToStaticMarkup(
      <EditorBridgeProvider
        value={{
          device: 'desktop',
          setDevice: () => {},
          parentType: 'Container',
          parentProps: { container: { mode: 'grid' } },
        }}
      >
        <ContainerSizeControl value={{ grow: { desktop: 1 } }} onChange={() => {}} />
      </EditorBridgeProvider>
    );
    assert.doesNotMatch(gridParentHtml, /As a flex item/);
    assert.match(gridParentHtml, /Flex-item sizing is set/);
    assert.match(gridParentHtml, /Clear/);
  });

  it('shows Align content only when Wrap is not nowrap', () => {
    const nowrapHtml = renderToStaticMarkup(
      createElement(ContainerFlexControl, {
        value: { mode: 'flex', wrap: { desktop: 'nowrap' } },
        onChange: () => {},
      })
    );
    assert.doesNotMatch(nowrapHtml, /Align content/);

    const wrapHtml = renderToStaticMarkup(
      createElement(ContainerFlexControl, {
        value: { mode: 'flex', wrap: { desktop: 'wrap' } },
        onChange: () => {},
      })
    );
    assert.match(wrapHtml, /Align content/);
  });

  it('renders linked gap vs split column/row gap cleanly', () => {
    const linkedHtml = renderToStaticMarkup(
      createElement(LinkedGapInput, {
        value: { gap: { desktop: 16 }, gapUnit: 'px' },
        onChange: () => {},
      })
    );
    assert.match(linkedHtml, /Unlink gap/);
    assert.doesNotMatch(linkedHtml, /Column gap/);

    const unlinkedHtml = renderToStaticMarkup(
      createElement(LinkedGapInput, {
        value: { columnGap: { desktop: 12 }, rowGap: { desktop: 20 }, gapUnit: 'px' },
        onChange: () => {},
      })
    );
    assert.match(unlinkedHtml, /Link gap/);
    assert.match(unlinkedHtml, /Column gap/);
    assert.match(unlinkedHtml, /Row gap/);

    assert.deepEqual(linkedGapPatch({ desktop: 16 }, 'px'), {
      gap: { desktop: 16 },
      gapUnit: 'px',
      columnGap: undefined,
      rowGap: undefined,
    });
    assert.deepEqual(unlinkedGapPatch('columnGap', { desktop: 24 }, 'px'), {
      columnGap: { desktop: 24 },
      gapUnit: 'px',
      gap: undefined,
    });
    assert.deepEqual(toggleGapLinkPatch({ gap: { desktop: 12 } }, false), {
      gap: undefined,
      columnGap: { desktop: 12 },
      rowGap: { desktop: 12 },
    });
    assert.deepEqual(
      toggleGapLinkPatch({ columnGap: { desktop: 16 }, rowGap: { desktop: 8 } }, true),
      {
        gap: { desktop: 16 },
        columnGap: undefined,
        rowGap: undefined,
      }
    );
  });
});

describe('Track stepper helper', () => {
  it('increments and decrements repeat() and list tracks', () => {
    assert.equal(stepTrackList('repeat(3, 1fr)', 1), 'repeat(4, 1fr)');
    assert.equal(stepTrackList('repeat(2, 1fr)', -1), '1fr');
    assert.equal(stepTrackList('280px 1fr', 1), '280px 1fr 1fr');
    assert.equal(stepTrackList('280px 1fr', -1), '280px');
  });
});

describe('Hidden legacy styles notice', () => {
  it('renders nothing when no legacy styles are set and lists saved values when present', () => {
    assert.deepEqual(getLegacySectionStyleLabels({}), []);
    const emptyHtml = renderToStaticMarkup(
      createElement(ContainerLegacyNotice, {
        value: { paddingY: 'none', background: 'default' },
        onChange: () => {},
      })
    );
    assert.equal(emptyHtml, '');

    const section = {
      typography: { fontSize: { desktop: 18 } },
      textColor: '#111827',
      display: { minHeight: { desktop: 'half' as const }, contentAlign: { desktop: 'center' as const } },
      align: { desktop: 'center' as const },
    };
    assert.deepEqual(getLegacySectionStyleLabels(section), [
      'Typography',
      'Text color',
      'Height & alignment',
      'Text alignment',
    ]);

    const noticeHtml = renderToStaticMarkup(
      createElement(ContainerLegacyNotice, {
        value: section,
        onChange: () => {},
      })
    );
    assert.match(noticeHtml, /Hidden legacy styles/);
    assert.match(noticeHtml, /Typography/);
    assert.match(noticeHtml, /Text color/);
    assert.match(noticeHtml, /Height &amp; alignment/);
    assert.match(noticeHtml, /Text alignment/);
    assert.match(noticeHtml, /Clear/);
  });
});

describe('Elementor-style DeviceRow breakpoint selector', () => {
  it('renders a single active device trigger and lists all enabled devices top to bottom', () => {
    const items = getDeviceListItems();
    assert.deepEqual(
      items.map(i => i.device),
      ['desktop', 'tablet', 'mobile']
    );
    assert.deepEqual(
      items.map(i => i.hint),
      ['Default', '≤ 1023px', '≤ 767px']
    );

    const html = renderToStaticMarkup(
      <EditorBridgeProvider
        value={{
          device: 'tablet',
          setDevice: () => {},
        }}
      >
        <DeviceRow />
      </EditorBridgeProvider>
    );
    assert.match(html, /aria-label="Edit for device: Tablet"/);
    assert.doesNotMatch(html, /aria-label="Mobile"/);
  });
});
