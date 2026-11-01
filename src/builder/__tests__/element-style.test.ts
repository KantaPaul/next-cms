import assert from 'node:assert';
import { describe, it } from 'node:test';
import { resolveElementStyle } from '../style';

describe('resolveElementStyle', () => {
  it('returns empty classes and style when undefined', () => {
    const res = resolveElementStyle(undefined);
    assert.deepEqual(res, { classes: [], style: {} });
  });

  it('sets color style property', () => {
    const res = resolveElementStyle({ color: '#10b981' });
    assert.equal(res.style.color, '#10b981');
    assert.equal(res.classes.length, 0);
  });

  it('sets typography variables across all three devices', () => {
    const res = resolveElementStyle({
      typography: {
        fontSize: { desktop: 32, mobile: 18 },
        fontSizeUnit: 'px',
        lineHeight: { desktop: 1.5 },
        lineHeightUnit: 'em',
      },
    });

    assert.ok(res.classes.includes('s-fs'));
    assert.ok(res.classes.includes('s-lh'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-fs-d'], '32px');
    assert.equal(style['--s-fs-t'], '32px'); // fallback from desktop
    assert.equal(style['--s-fs-m'], '18px');
    assert.equal(style['--s-lh-d'], '1.5em');
    assert.equal(style['--s-lh-t'], '1.5em');
    assert.equal(style['--s-lh-m'], '1.5em');
  });

  it('sets hover classes and hover CSS variables', () => {
    const res = resolveElementStyle({
      color: '#000000',
      hover: {
        color: '#3b82f6',
        borderColor: '#e5e7eb',
      },
    });

    assert.ok(res.classes.includes('s-hc'));
    assert.ok(res.classes.includes('s-hb'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-h-color'], '#3b82f6');
    assert.equal(style['--s-h-bd'], '#e5e7eb');
  });

  it('sets padding and margin responsive variables', () => {
    const res = resolveElementStyle({
      padding: { desktop: { top: 12, bottom: 12, left: 24, right: 24 } },
      paddingUnit: 'px',
    });

    assert.ok(res.classes.includes('s-pt'));
    assert.ok(res.classes.includes('s-pb'));
    assert.ok(res.classes.includes('s-pl'));
    assert.ok(res.classes.includes('s-pr'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-pt-d'], '12px');
    assert.equal(style['--s-pt-t'], '12px');
    assert.equal(style['--s-pt-m'], '12px');
  });
});
