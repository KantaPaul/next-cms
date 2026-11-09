import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  readOverlayLayout,
  resolveBackdropColor,
  resolveOverlayPanelStyle,
} from '../layout-style';
import { normalizeOverlaySettings } from '../settings';
import { DEFAULT_DRAWER_SETTINGS, DEFAULT_POPUP_SETTINGS } from '../types';

const vars = (style: unknown) => style as Record<string, string>;

describe('readOverlayLayout', () => {
  it('converts older saved values', () => {
    const layout = readOverlayLayout(
      {
        width: '90vw',
        maxHeight: 'auto',
        padding: 'lg',
        radius: 'sm',
        overlayColor: 'rgba(0, 0, 0, 0.85)',
      },
      'Popup'
    );
    assert.deepEqual(layout.width, { value: { desktop: 90 }, unit: 'vw' });
    assert.deepEqual(layout.maxHeight, { unit: 'vh' });
    assert.equal(layout.padding?.value?.desktop?.top, 40);
    assert.equal(layout.padding?.value?.mobile?.top, 32);
    assert.deepEqual(layout.radius, { value: { desktop: 8 }, unit: 'px' });
    assert.deepEqual(layout.overlayColor, { color: '#000000', opacity: 85 });
  });

  it('keeps an older solid backdrop solid', () => {
    assert.deepEqual(
      readOverlayLayout({ overlayColor: '#112233' }, 'Popup').overlayColor,
      { color: '#112233', opacity: 100 }
    );
    assert.equal(
      readOverlayLayout({ overlayColor: 'rgb(255, 0, 0)' }, 'Popup').overlayColor
        ?.opacity,
      100
    );
  });

  it('falls back to the default for values it cannot read', () => {
    const layout = readOverlayLayout(
      { width: 'calc(100% - 2rem)', radius: 'huge', background: 'url(x)' },
      'Drawer'
    );
    const d = DEFAULT_DRAWER_SETTINGS.layout;
    assert.deepEqual(layout.width, d.width);
    assert.deepEqual(layout.radius, d.radius);
    assert.equal(layout.background, d.background);
  });

  it('passes new values through and ignores unknown units', () => {
    const width = { value: { desktop: 600, mobile: 90 }, unit: 'vw' };
    assert.deepEqual(readOverlayLayout({ width }, 'Popup').width, width);
    assert.equal(
      readOverlayLayout({ width: { value: { desktop: 600 }, unit: 'vh' } }, 'Popup')
        .width?.unit,
      'px'
    );
  });

  it('normalizes through the settings entry point', () => {
    const s = normalizeOverlaySettings({ layout: { width: '520px' } }, 'Popup');
    assert.deepEqual(s.layout.width, { value: { desktop: 520 }, unit: 'px' });
    assert.deepEqual(s.layout.padding, DEFAULT_POPUP_SETTINGS.layout.padding);
  });
});

describe('resolveOverlayPanelStyle', () => {
  it('inherits from larger devices unless overridden', () => {
    const style = vars(
      resolveOverlayPanelStyle(
        readOverlayLayout(
          {
            width: { value: { desktop: 600, mobile: 300 }, unit: 'px' },
            radius: { value: { desktop: 10 }, unit: 'px' },
            padding: {
              value: { desktop: { top: 8, left: 4 }, tablet: { top: 2 } },
              unit: 'px',
            },
          },
          'Popup'
        ),
        'Popup',
        'center'
      )
    );
    assert.equal(style['--ov-w-d'], '600px');
    assert.equal(style['--ov-w-t'], '600px');
    assert.equal(style['--ov-w-m'], '300px');
    assert.equal(style['--ov-rad-m'], '10px');
    assert.equal(style['--ov-p-d'], '8px 0 0 4px');
    assert.equal(style['--ov-p-t'], '2px 0 0 4px');
  });

  it('keeps fit-content popups inside the viewport', () => {
    const style = vars(
      resolveOverlayPanelStyle(
        readOverlayLayout({ maxHeight: 'auto' }, 'Popup'),
        'Popup',
        'center'
      )
    );
    assert.equal(style['--ov-mh-d'], 'calc(100dvh - 2rem)');
  });

  it('ignores the size a drawer position cannot use', () => {
    const layout = readOverlayLayout(
      {
        width: { value: { desktop: 300 }, unit: 'px' },
        maxHeight: { value: { desktop: 50 }, unit: 'vh' },
      },
      'Drawer'
    );
    const side = vars(resolveOverlayPanelStyle(layout, 'Drawer', 'right'));
    assert.equal(side['--ov-w-d'], '300px');
    assert.equal(side['--ov-mh-d'], 'none');
    const edge = vars(resolveOverlayPanelStyle(layout, 'Drawer', 'bottom'));
    assert.equal(edge['--ov-w-d'], '100%');
    assert.equal(edge['--ov-mh-d'], '50vh');
  });

  it('matches the old defaults', () => {
    const popup = vars(
      resolveOverlayPanelStyle(
        readOverlayLayout({}, 'Popup'),
        'Popup',
        'center'
      )
    );
    assert.equal(popup['--ov-w-d'], '480px');
    assert.equal(popup['--ov-mh-d'], '90vh');
    assert.equal(popup['--ov-p-d'], '24px 24px 24px 24px');
    assert.equal(popup['--ov-rad-d'], '14px');
  });
});

describe('resolveBackdropColor', () => {
  it('fades hex and theme colors', () => {
    assert.equal(
      resolveBackdropColor({ color: '#000000', opacity: 50 }),
      'color-mix(in srgb, #000000 50%, transparent)'
    );
    assert.equal(
      resolveBackdropColor({ color: 'var(--site-color-primary)', opacity: 25 }),
      'color-mix(in srgb, var(--site-color-primary) 25%, transparent)'
    );
  });

  it('handles the ends of the range and bad colors', () => {
    assert.equal(
      resolveBackdropColor({ color: '#123456', opacity: 100 }),
      '#123456'
    );
    assert.equal(
      resolveBackdropColor({ color: '#123456', opacity: 0 }),
      'transparent'
    );
    assert.equal(
      resolveBackdropColor({ color: 'red;}', opacity: 50 }),
      undefined
    );
  });
});
