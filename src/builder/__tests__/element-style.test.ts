import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  resolveElementStyle,
  resolveImageSize,
  resolveSectionStyle,
} from '../style';
import { linkEl } from '../blocks/element';

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

  it('sets text stroke with responsive width and fallback', () => {
    const res = resolveElementStyle({
      textStroke: {
        width: { desktop: 2, mobile: 1 },
        color: '#ff0000',
      },
    });

    assert.ok(res.classes.includes('s-tst'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-tst'], '2px #ff0000');
    assert.equal(style['--s-tst-d'], '2px #ff0000');
    assert.equal(style['--s-tst-t'], '2px #ff0000'); // desktop fallback
    assert.equal(style['--s-tst-m'], '1px #ff0000');
  });

  it('sets text shadow CSS variable and class', () => {
    const res = resolveElementStyle({
      textShadow: {
        x: 2,
        y: 4,
        blur: 6,
        color: '#112233',
      },
    });

    assert.ok(res.classes.includes('s-tsh'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-tsh'], '2px 4px 6px #112233');
  });

  it('sets CSS filter with grayscale and other properties', () => {
    const res = resolveElementStyle({
      filter: {
        blur: 4,
        contrast: 120,
        grayscale: 80,
      },
    });

    assert.ok(res.classes.includes('s-filter'));
    const style = res.style as Record<string, string>;
    assert.ok(style['--s-filter'].includes('grayscale(80%)'));
    assert.ok(style['--s-filter'].includes('blur(4px)'));
    assert.ok(style['--s-filter'].includes('contrast(120%)'));
  });

  it('sets image size variables and class', () => {
    const res = resolveElementStyle({
      imageSize: {
        size: 'custom',
        width: 450,
        height: 300,
      },
    });

    assert.ok(res.classes.includes('s-img-size'));
    const style = res.style as Record<string, string>;
    assert.equal(style['--s-img-w'], '450px');
    assert.equal(style['--s-img-h'], '300px');
  });

  it('sets Google font family and numeric weight', () => {
    const res = resolveElementStyle({
      typography: {
        family: 'Inter',
        fontWeight: 600,
        wordSpacing: { desktop: 3, mobile: 1 },
        wordSpacingUnit: 'px',
      },
    });

    assert.ok(res.classes.includes('s-ff'));
    assert.ok(res.classes.includes('s-fw'));
    assert.ok(res.classes.includes('s-ws'));
    const style = res.style as Record<string, string>;
    assert.ok(style['--s-ff'].includes("'Inter'"));
    assert.equal(style['--s-fw-d'], '600');
    assert.equal(style['--s-fw-t'], '600');
    assert.equal(style['--s-fw-m'], '600');
    assert.equal(style['--s-ws-d'], '3px');
    assert.equal(style['--s-ws-t'], '3px');
    assert.equal(style['--s-ws-m'], '1px');
  });

  it('sets element hover filter', () => {
    const res = resolveElementStyle({
      hover: {
        filter: { grayscale: 100 },
      },
    });

    assert.ok(res.classes.includes('s-hfl'));
    const style = res.style as Record<string, string>;
    assert.ok(style['--s-h-filter'].includes('grayscale(100%)'));
  });
});

describe('resolveSectionStyle', () => {
  it('returns empty when undefined', () => {
    const res = resolveSectionStyle(undefined);
    assert.deepEqual(res, {
      outerClasses: [],
      innerClasses: [],
      style: {},
      hasFill: false,
    });
  });

  it('resolves full section hover states including filter', () => {
    const res = resolveSectionStyle({
      hover: {
        textColor: '#123456',
        fill: { type: 'color', color: '#654321' },
        borderColor: '#00ff00',
        shadow: { x: 0, y: 10, blur: 20, color: 'rgba(0,0,0,0.2)' },
        filter: { grayscale: 75, blur: 3 },
      },
    });

    assert.ok(res.outerClasses.includes('s-hc'));
    assert.ok(res.outerClasses.includes('s-hf'));
    assert.ok(res.outerClasses.includes('s-hb'));
    assert.ok(res.outerClasses.includes('s-hs'));
    assert.ok(res.outerClasses.includes('s-hfl'));

    const style = res.style as Record<string, string>;
    assert.equal(style['--s-h-color'], '#123456');
    assert.equal(style['--s-h-fill'], '#654321');
    assert.equal(style['--s-h-bd'], '#00ff00');
    assert.ok(style['--s-h-shadow'].includes('20px'));
    assert.ok(style['--s-h-filter'].includes('grayscale(75%)'));
    assert.ok(style['--s-h-filter'].includes('blur(3px)'));
  });

  it('resolves responsive background image position, size, attachment, repeat', () => {
    const res = resolveSectionStyle({
      fill: {
        type: 'image',
        image: 'https://example.com/hero.jpg',
        position: { desktop: 'center top', mobile: 'center center' },
        size: { desktop: 'cover', mobile: 'contain' },
        attachment: 'fixed',
        repeat: 'no-repeat',
      },
    });

    assert.ok(res.outerClasses.includes('s-bg-pos'));
    assert.ok(res.outerClasses.includes('s-bg-size'));
    assert.ok(res.outerClasses.includes('s-bg-attach'));
    assert.ok(res.outerClasses.includes('s-bg-repeat'));

    const style = res.style as Record<string, string>;
    assert.equal(style['--s-bg-pos-d'], 'center top');
    assert.equal(style['--s-bg-pos-t'], 'center top');
    assert.equal(style['--s-bg-pos-m'], 'center center');

    assert.equal(style['--s-bg-size-d'], 'cover');
    assert.equal(style['--s-bg-size-t'], 'cover');
    assert.equal(style['--s-bg-size-m'], 'contain');

    assert.equal(style['--s-bg-attach'], 'fixed');
    assert.equal(style['--s-bg-repeat'], 'no-repeat');
  });

  it('resolves section typography with Google font family and numeric weight', () => {
    const res = resolveSectionStyle({
      typography: {
        family: 'Roboto',
        fontWeight: 500,
      },
    });

    assert.ok(res.outerClasses.includes('s-ff'));
    assert.ok(res.outerClasses.includes('s-fw'));
    const style = res.style as Record<string, string>;
    assert.ok(style['--s-ff'].includes("'Roboto'"));
    assert.equal(style['--s-fw-d'], '500');
    assert.equal(style['--s-fw-t'], '500');
    assert.equal(style['--s-fw-m'], '500');
  });
});

describe('resolveImageSize', () => {
  it('resolves thumbnail preset and appends query params', () => {
    const res = resolveImageSize({ size: 'thumbnail' }, '/uploads/photo.jpg');
    assert.equal(res.width, 150);
    assert.equal(res.height, 150);
    assert.equal(res.src, '/uploads/photo.jpg?w=150&h=150');
    assert.equal(res.sizes, '(max-width: 150px) 100vw, 150px');
  });

  it('resolves medium and large presets', () => {
    const med = resolveImageSize({ size: 'medium' });
    assert.equal(med.width, 300);
    assert.equal(med.height, 300);

    const lrg = resolveImageSize({ size: 'large' });
    assert.equal(lrg.width, 1024);
    assert.equal(lrg.height, 1024);
  });

  it('resolves full preset without altering src', () => {
    const res = resolveImageSize({ size: 'full' }, '/uploads/photo.jpg');
    assert.equal(res.width, undefined);
    assert.equal(res.height, undefined);
    assert.equal(res.src, '/uploads/photo.jpg');
    assert.equal(res.sizes, undefined);
  });

  it('resolves custom width and height on absolute URLs', () => {
    const res = resolveImageSize(
      { size: 'custom', width: 800, height: 600 },
      'https://example.com/banner.png'
    );
    assert.equal(res.width, 800);
    assert.equal(res.height, 600);
    assert.equal(res.src, 'https://example.com/banner.png?w=800&h=600');
    assert.equal(res.sizes, '(max-width: 800px) 100vw, 800px');
  });
});

describe('linkEl', () => {
  it('returns baseClass and empty style when undefined', () => {
    const res = linkEl(undefined, 'link', 'text-sm font-medium');
    assert.equal(res.className, 'text-sm font-medium');
    assert.deepEqual(res.style, {});
  });

  it('adds hover feedback only when a colour has no hover colour', () => {
    const withColorOnly = linkEl(
      { elements: { link: { color: '#ff0000' } } },
      'link',
      'text-sm font-medium'
    );
    assert.ok(withColorOnly.className.includes('hover:opacity-80'));
    assert.equal((withColorOnly.style as any).color, '#ff0000');

    const withHoverColor = linkEl(
      { elements: { link: { color: '#ff0000', hover: { color: '#00ff00' } } } },
      'link',
      'text-sm font-medium'
    );
    assert.ok(!withHoverColor.className.includes('hover:opacity-80'));
    assert.ok(withHoverColor.className.includes('s-hc'));

    const withNoColor = linkEl(
      { elements: { link: { typography: { fontSize: { desktop: 16 } } } } },
      'link',
      'text-sm font-medium'
    );
    assert.ok(!withNoColor.className.includes('hover:opacity-80'));
  });
});
