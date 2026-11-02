/**
 * Unit tests for the Container / Flexbox / Grid layout schema:
 * validation, defaults, legacy normalization, breakpoint inheritance,
 * and CSS style generation.
 *
 * Run with: npx tsx --test src/builder/__tests__/layout.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  LANDMARK_TAGS,
  normalizeContainerSettings,
  safeTrackList,
  resolveContainerStyle,
  resolveFlexItemStyle,
  resolveGridItemStyle,
  type ContainerSettings,
  type Device,
  DEVICES,
  deviceForWidth,
  resolveResponsive,
} from '../style';

describe('normalizeContainerSettings', () => {
  it('returns safe defaults for undefined input', () => {
    const result = normalizeContainerSettings(undefined);
    assert.equal(result.tag, 'div');
    assert.equal(result.mode, 'flex');
    assert.equal(result.boxSizing, 'border-box');
    assert.equal(result.gapUnit, 'px');
    assert.equal(result.sizeUnit, 'px');
    assert.equal(result.basisUnit, 'px');
    assert.deepEqual(result.direction, { desktop: 'row' });
    assert.deepEqual(result.wrap, { desktop: 'nowrap' });
    assert.deepEqual(result.justify, { desktop: 'start' });
    assert.deepEqual(result.alignItems, { desktop: 'stretch' });
    assert.deepEqual(result.alignContent, { desktop: 'start' });
    assert.equal(result.gap, undefined);
    assert.equal(result.width, undefined);
    assert.equal(result.link, undefined);
  });

  it('drops unknown props and keeps allow-listed enums', () => {
    const result = normalizeContainerSettings({
      tag: 'section',
      mode: 'nonsense' as unknown as string,
      direction: 'column',
      justify: 'between',
      boxSizing: 'border-box',
      unknownProp: 'delete me',
      script: '<script>alert(1)</script>' as unknown as string,
    });
    assert.equal(result.tag, 'section');
    assert.equal(result.mode, 'flex');
    assert.deepEqual(result.direction, { desktop: 'column' });
    assert.deepEqual(result.justify, { desktop: 'between' });
    assert.equal((result as Record<string, unknown>).unknownProp, undefined);
    assert.equal((result as Record<string, unknown>).script, undefined);
  });

  it('clamps numeric values to unit limits', () => {
    const result = normalizeContainerSettings({
      width: 99999,
      maxWidth: -5,
      gap: 1000000,
      grow: -10,
      basis: 500,
      boxedWidth: 50000,
    } as unknown as ContainerSettings);
    assert.deepEqual(result.width, { desktop: 200 });
    assert.deepEqual(result.maxWidth, { desktop: 0 });
    assert.deepEqual(result.gap, { desktop: 200 });
    assert.deepEqual(result.grow, { desktop: 0 });
    assert.deepEqual(result.basis, { desktop: 200 });
    assert.deepEqual(result.boxedWidth, { desktop: 2000 });
  });

  it('keeps responsive per-device values clamped independently', () => {
    const result = normalizeContainerSettings({
      width: { desktop: 100, tablet: 50, mobile: 'big' as unknown as number },
    } as unknown as ContainerSettings);
    assert.deepEqual(result.width, { desktop: 100, tablet: 50 });
    assert.equal((result.width as Record<string, number>).mobile, undefined);
  });

  it('normalizes a whole-container link', () => {
    const result = normalizeContainerSettings({
      link: 'https://example.com/',
    } as unknown as ContainerSettings);
    assert.equal(
      (result.link as { url?: string } | undefined)?.url,
      'https://example.com/'
    );
    const bad = normalizeContainerSettings({
      link: 'javascript:alert(1)',
    } as unknown as ContainerSettings);
    assert.equal(bad.link, undefined);
  });

  it('validates track strings and rejects injection', () => {
    assert.equal(safeTrackList('1fr 1fr'), '1fr 1fr');
    assert.equal(
      safeTrackList('repeat(auto-fit, minmax(200px, 1fr))'),
      'repeat(auto-fit, minmax(200px, 1fr))'
    );
    assert.equal(safeTrackList('repeat(3, 1fr 2fr)'), 'repeat(3, 1fr, 2fr)');
    assert.equal(safeTrackList('minmax(200px, 1fr)'), 'minmax(200px, 1fr)');
    assert.equal(
      safeTrackList('auto min-content max-content fit-content(200px)'),
      'auto min-content max-content fit-content(200px)'
    );
    assert.equal(safeTrackList('javascript:alert(1)'), undefined);
    assert.equal(safeTrackList('1fr; delete table users;--'), undefined);
    assert.equal(safeTrackList(''), undefined);
    assert.equal(safeTrackList(undefined), undefined);
  });
});

describe('resolveContainerStyle', () => {
  it('emits flex classes and variables for desktop', () => {
    const { classes, style } = resolveContainerStyle(
      {
        mode: 'flex',
        direction: { desktop: 'row' },
        justify: { desktop: 'center' },
        gap: { desktop: 16 },
        width: { desktop: 100 },
      } as ContainerSettings,
      'desktop'
    );
    assert.ok(classes.includes('s-c-d'));
    assert.ok(classes.includes('s-c-fd'));
    assert.ok(classes.includes('s-c-jc'));
    assert.ok(classes.includes('s-c-ga'));
    assert.ok(classes.includes('s-c-w'));
    assert.equal((style as Record<string, string>)['--s-c-d-d'], 'flex');
    assert.equal((style as Record<string, string>)['--s-c-fd-d'], 'row');
    assert.equal((style as Record<string, string>)['--s-c-jc-d'], 'center');
    assert.equal((style as Record<string, string>)['--s-c-ga-d'], '16px');
    assert.equal((style as Record<string, string>)['--s-c-w-d'], '100px');
  });

  it('grid mode emits grid track variables', () => {
    const { classes, style } = resolveContainerStyle(
      {
        mode: 'grid',
        gridTemplateColumns: { desktop: 'repeat(3, 1fr)' },
        gridAutoFlow: { desktop: 'row-dense' },
        columnGap: { desktop: 12 },
      } as ContainerSettings,
      'desktop'
    );
    assert.ok(classes.includes('s-c-gtc'));
    assert.ok(classes.includes('s-c-gaf'));
    assert.ok(classes.includes('s-c-cga'));
    assert.equal(
      (style as Record<string, string>)['--s-c-gtc-d'],
      'repeat(3, 1fr)'
    );
    assert.equal((style as Record<string, string>)['--s-c-gaf-d'], 'row-dense');
    assert.equal((style as Record<string, string>)['--s-c-cga-d'], '12px');
  });

  it('does not emit unset properties', () => {
    const { classes, style } = resolveContainerStyle(
      { mode: 'flex' } as ContainerSettings,
      'desktop'
    );
    assert.ok(!classes.includes('s-c-ga'));
    assert.ok(!classes.includes('s-c-w'));
    assert.equal((style as Record<string, string>)['--s-c-ga-d'], undefined);
    assert.equal((style as Record<string, string>)['--s-c-w-d'], undefined);
  });

  it('boxed content width emits the boxed class and width variable', () => {
    const { classes, style } = resolveContainerStyle(
      {
        contentWidth: 'boxed',
        boxedWidth: { desktop: 800 },
      } as ContainerSettings,
      'desktop'
    );
    assert.ok(classes.includes('s-c-boxed'));
    assert.equal((style as Record<string, string>)['--s-c-bw-d'], '800px');
  });

  it('applies unit to length values', () => {
    const { style } = resolveContainerStyle(
      {
        width: { desktop: 50 },
        sizeUnit: '%',
      } as ContainerSettings,
      'desktop'
    );
    assert.equal((style as Record<string, string>)['--s-c-w-d'], '50%');
  });
});

describe('breakpoint inheritance', () => {
  for (const device of DEVICES) {
    it(`inherits unset breakpoints from desktop on ${device}`, () => {
      const s = resolveContainerStyle(
        { direction: { desktop: 'column' } } as ContainerSettings,
        device
      ).style as Record<string, string>;
      const suffix =
        device === 'desktop' ? 'd' : device === 'tablet' ? 't' : 'm';
      assert.equal(s[`--s-c-fd-${suffix}`], 'column');
    });
  }

  it('resolveResponsive falls back through the device order', () => {
    const valid = (x: unknown) =>
      typeof x === 'number' && Number.isFinite(x) ? x : undefined;
    assert.equal(resolveResponsive({ tablet: 2 }, 'mobile', valid), 2);
    assert.equal(resolveResponsive({ desktop: 1 }, 'tablet', valid), 1);
    assert.equal(resolveResponsive(undefined, 'mobile', valid), undefined);
    assert.equal(resolveResponsive({ mobile: 3 }, 'mobile', valid), 3);
  });
});

describe('per-child flex and grid styles', () => {
  it('resolves flex item settings', () => {
    const style = resolveFlexItemStyle(
      {
        grow: { desktop: 2 },
        shrink: { desktop: 1 },
        basis: { desktop: 200 },
        basisUnit: 'px',
        alignSelf: { desktop: 'center' },
        order: { desktop: 2 },
      },
      'desktop'
    );
    assert.equal(style.flexGrow, 2);
    assert.equal(style.flexShrink, 1);
    assert.equal(style.flexBasis, '200px');
    assert.equal(style.alignSelf, 'center');
    assert.equal(style.order, 2);
  });

  it('omits unset flex item settings', () => {
    const style = resolveFlexItemStyle(undefined, 'desktop');
    assert.equal(Object.keys(style).length, 0);
  });

  it('resolves grid item placement', () => {
    const style = resolveGridItemStyle(
      {
        columnStart: { desktop: 2 },
        columnSpan: { desktop: 2 },
        rowStart: { desktop: 1 },
        rowSpan: { desktop: 3 },
      },
      'desktop'
    );
    assert.equal(style.gridColumnStart, 2);
    assert.equal(style.gridColumnEnd, 'span 2');
    assert.equal(style.gridRowStart, 1);
    assert.equal(style.gridRowEnd, 'span 3');
  });
});

describe('LANDMARK_TAGS', () => {
  it('lists main and nav', () => {
    assert.ok(LANDMARK_TAGS.includes('main'));
    assert.ok(LANDMARK_TAGS.includes('nav'));
    assert.equal(LANDMARK_TAGS.length, 2);
  });
});

describe('Container sizing controls (R397 / BLD-05)', () => {
  it('emits classes and CSS variables for width, min/max width, height, min/max height', () => {
    const { classes, style } = resolveContainerStyle(
      {
        width: { desktop: 180 },
        minWidth: { desktop: 50 },
        maxWidth: { desktop: 200 },
        height: { desktop: 120 },
        minHeight: { desktop: 40 },
        maxHeight: { desktop: 200 },
        sizeUnit: 'px',
      } as ContainerSettings,
      'desktop'
    );

    assert.ok(classes.includes('s-c-w'));
    assert.ok(classes.includes('s-c-nw'));
    assert.ok(classes.includes('s-c-xw'));
    assert.ok(classes.includes('s-c-h'));
    assert.ok(classes.includes('s-c-nh'));
    assert.ok(classes.includes('s-c-xh'));

    const s = style as Record<string, string>;
    assert.equal(s['--s-c-w-d'], '180px');
    assert.equal(s['--s-c-nw-d'], '50px');
    assert.equal(s['--s-c-xw-d'], '200px');
    assert.equal(s['--s-c-h-d'], '120px');
    assert.equal(s['--s-c-nh-d'], '40px');
    assert.equal(s['--s-c-xh-d'], '200px');
  });

  it('emits classes and CSS variables for grow, shrink, and basis with unit', () => {
    const { classes, style } = resolveContainerStyle(
      {
        grow: { desktop: 2 },
        shrink: { desktop: 0 },
        basis: { desktop: 160 },
        basisUnit: 'px',
      } as ContainerSettings,
      'desktop'
    );

    assert.ok(classes.includes('s-c-grw'));
    assert.ok(classes.includes('s-c-grs'));
    assert.ok(classes.includes('s-c-grb'));

    const s = style as Record<string, string>;
    assert.equal(s['--s-c-grw-d'], '2');
    assert.equal(s['--s-c-grs-d'], '0');
    assert.equal(s['--s-c-grb-d'], '160px');
  });

  it('handles box-sizing as border-box and content-box and responsive values', () => {
    const defaultRes = resolveContainerStyle(
      { boxSizing: 'content-box' } as ContainerSettings,
      'desktop'
    );
    assert.ok(defaultRes.classes.includes('s-c-box'));
    assert.equal(
      (defaultRes.style as Record<string, string>)['--s-c-box-d'],
      'content-box'
    );

    const responsiveRes = resolveContainerStyle(
      {
        boxSizing: { desktop: 'border-box', mobile: 'content-box' },
      } as ContainerSettings,
      'desktop'
    );
    const rs = responsiveRes.style as Record<string, string>;
    assert.equal(rs['--s-c-box-d'], 'border-box');
    assert.equal(rs['--s-c-box-t'], 'border-box');
    assert.equal(rs['--s-c-box-m'], 'content-box');
  });
});

describe('Responsive breakpoint inheritance and preview (R401 / BLD-09)', () => {
  it('maps viewport widths to breakpoints correctly via deviceForWidth', () => {
    assert.equal(deviceForWidth(1400), 'desktop');
    assert.equal(deviceForWidth(1024), 'desktop');
    assert.equal(deviceForWidth(1023), 'tablet');
    assert.equal(deviceForWidth(768), 'tablet');
    assert.equal(deviceForWidth(767), 'mobile');
    assert.equal(deviceForWidth(375), 'mobile');
  });

  it('cascades sizing settings with desktop fallback to tablet and mobile', () => {
    const { style } = resolveContainerStyle(
      {
        width: { desktop: 100 },
        grow: { desktop: 1 },
        sizeUnit: '%',
      } as ContainerSettings,
      'desktop'
    );
    const s = style as Record<string, string>;
    assert.equal(s['--s-c-w-d'], '100%');
    assert.equal(s['--s-c-w-t'], '100%');
    assert.equal(s['--s-c-w-m'], '100%');
    assert.equal(s['--s-c-grw-d'], '1');
    assert.equal(s['--s-c-grw-t'], '1');
    assert.equal(s['--s-c-grw-m'], '1');
  });

  it('tablet overrides desktop, and mobile inherits tablet override when mobile is unset', () => {
    const { style } = resolveContainerStyle(
      {
        width: { desktop: 100, tablet: 75 },
        grow: { desktop: 0, tablet: 2 },
        sizeUnit: '%',
      } as ContainerSettings,
      'desktop'
    );
    const s = style as Record<string, string>;
    assert.equal(s['--s-c-w-d'], '100%');
    assert.equal(s['--s-c-w-t'], '75%');
    assert.equal(s['--s-c-w-m'], '75%');
    assert.equal(s['--s-c-grw-d'], '0');
    assert.equal(s['--s-c-grw-t'], '2');
    assert.equal(s['--s-c-grw-m'], '2');
  });

  it('reset-to-inherited logic removes device override reverting to ancestor value', () => {
    const baseSettings = {
      width: { desktop: 100, tablet: 75, mobile: 50 },
    };
    // Simulating resetting mobile override
    const nextMobile = { ...baseSettings.width };
    delete (nextMobile as Partial<Record<Device, number>>).mobile;

    const validNum = (x: unknown) =>
      typeof x === 'number' && Number.isFinite(x) ? x : undefined;
    assert.equal(resolveResponsive(nextMobile, 'mobile', validNum), 75);

    // Simulating resetting tablet override
    const nextTablet = { ...nextMobile };
    delete (nextTablet as Partial<Record<Device, number>>).tablet;
    assert.equal(resolveResponsive(nextTablet, 'mobile', validNum), 100);
    assert.equal(resolveResponsive(nextTablet, 'tablet', validNum), 100);
  });
});
