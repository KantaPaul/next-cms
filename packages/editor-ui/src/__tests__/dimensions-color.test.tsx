import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ColorField,
  ContrastBadge,
  DimensionsField,
  getContrastRating,
  getContrastRatio,
  getLuminance,
  parseColor,
  toHex,
} from '../controls';
import { BoxModelWidget } from '../inspector/BoxModelWidget';

describe('Color utilities & WCAG contrast (E12d)', () => {
  it('parses various hex, rgb, and rgba strings', () => {
    assert.deepStrictEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepStrictEqual(parseColor('#000000'), { r: 0, g: 0, b: 0, a: 1 });
    assert.deepStrictEqual(parseColor('#2563eb80'), {
      r: 37,
      g: 99,
      b: 235,
      a: 0.5,
    });
    assert.deepStrictEqual(parseColor('rgb(10, 20, 30)'), {
      r: 10,
      g: 20,
      b: 30,
      a: 1,
    });
    assert.deepStrictEqual(parseColor('rgba(10, 20, 30, 0.5)'), {
      r: 10,
      g: 20,
      b: 30,
      a: 0.5,
    });
    assert.strictEqual(parseColor('invalid-color'), null);
  });

  it('formats RGBA to hex', () => {
    assert.strictEqual(toHex({ r: 255, g: 255, b: 255, a: 1 }), '#ffffff');
    assert.strictEqual(toHex({ r: 0, g: 0, b: 0, a: 1 }), '#000000');
    assert.strictEqual(toHex({ r: 37, g: 99, b: 235, a: 1 }), '#2563eb');
  });

  it('calculates relative luminance and contrast ratios accurately', () => {
    const white = parseColor('#ffffff')!;
    const black = parseColor('#000000')!;
    assert.strictEqual(getLuminance(white), 1);
    assert.strictEqual(getLuminance(black), 0);

    // Black on white is 21:1
    assert.strictEqual(getContrastRatio('#000000', '#ffffff'), 21);
    // White on white is 1:1
    assert.strictEqual(getContrastRatio('#ffffff', '#ffffff'), 1);

    // Ratings check
    assert.strictEqual(getContrastRating(21), 'AAA');
    assert.strictEqual(getContrastRating(5.5), 'AA');
    assert.strictEqual(getContrastRating(3.5), 'AA Large');
    assert.strictEqual(getContrastRating(2.1), 'Fail');
  });
});

describe('ColorField (E12d)', () => {
  it('renders trigger with color swatch, label, and contrast badge', () => {
    const html = renderToStaticMarkup(
      <ColorField
        label="Brand Color"
        value="#2563eb"
        onChange={() => {}}
        tokenName="Primary"
      />
    );
    assert.match(html, /Brand Color/);
    assert.match(html, /style="background-color:#2563eb"/);
    assert.match(html, /Primary/);
    // Contrast badge
    assert.match(html, /· AA/);
  });

  it('renders standalone trigger without label row', () => {
    const html = renderToStaticMarkup(
      <ColorField
        value="#000000"
        onChange={() => {}}
      />
    );
    assert.match(html, /21:1/);
    assert.match(html, /· AAA/);
  });
});

describe('DimensionsField (E12d)', () => {
  it('renders all sides linked mode with single input', () => {
    const html = renderToStaticMarkup(
      <DimensionsField
        label="Padding"
        value={{ top: 16, right: 16, bottom: 16, left: 16, unit: 'px' }}
        onChange={() => {}}
        mode="all"
      />
    );
    assert.match(html, /Padding/);
    assert.match(html, /aria-label="Link mode"/);
    assert.match(html, /aria-checked="true"[^>]*title="All sides linked"/);
    assert.match(html, /All/);
    assert.match(html, /value="16"/);
  });

  it('renders axial split mode with vertical Y and horizontal X inputs', () => {
    const html = renderToStaticMarkup(
      <DimensionsField
        label="Margin"
        value={{ top: 20, right: 10, bottom: 20, left: 10, unit: 'px' }}
        onChange={() => {}}
        mode="axial"
      />
    );
    assert.match(html, /aria-checked="true"[^>]*title="Horizontal &amp; vertical split"/);
    assert.match(html, /Y/);
    assert.match(html, /value="20"/);
    assert.match(html, /X/);
    assert.match(html, /value="10"/);
  });

  it('renders independent mode with T, R, B, L inputs around mini box', () => {
    const html = renderToStaticMarkup(
      <DimensionsField
        label="Padding"
        value={{ top: 5, right: 10, bottom: 15, left: 20, unit: 'px' }}
        onChange={() => {}}
        mode="independent"
      />
    );
    assert.match(html, /aria-checked="true"[^>]*title="Independent sides"/);
    assert.match(html, /T/);
    assert.match(html, /value="5"/);
    assert.match(html, /R/);
    assert.match(html, /value="10"/);
    assert.match(html, /B/);
    assert.match(html, /value="15"/);
    assert.match(html, /L/);
    assert.match(html, /value="20"/);
    assert.match(html, /Box/);
  });
});

describe('BoxModelWidget merged integration (E12d)', () => {
  it('renders nested margin and padding with link mode cycling buttons', () => {
    const html = renderToStaticMarkup(
      <BoxModelWidget
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        padding={{ top: 16, right: 16, bottom: 16, left: 16 }}
        onMarginChange={() => {}}
        onPaddingChange={() => {}}
        unit="px"
      />
    );
    assert.match(html, /margin/);
    assert.match(html, /pad/);
    assert.match(html, /px/);
    assert.match(html, /value="8"/);
    assert.match(html, /value="16"/);
  });
});
