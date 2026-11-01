import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALLOWED_CSS_PROPERTIES,
  type BackgroundValue,
  type BorderValue,
  type FlexContainerValue,
  type ShadowValue,
  type TypographyValue,
  backgroundSchema,
  backgroundToCSS,
  borderSchema,
  borderToCSS,
  filterAllowedCss,
  flexContainerSchema,
  flexContainerToCSS,
  sanitizeCssValue,
  shadowSchema,
  shadowToCSS,
  typographySchema,
  typographyToCSS,
} from '../style-schemas';

describe('Style Schemas & CSS Whitelist Mapping (E12f/g)', () => {
  describe('Typography', () => {
    it('validates a typography object', () => {
      const val: TypographyValue = {
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.02em',
        textAlign: 'center',
        textTransform: 'uppercase',
        textDecoration: 'underline',
        color: '#2563eb',
      };
      const parsed = typographySchema.parse(val);
      assert.equal(parsed.fontFamily, 'Inter, sans-serif');
      assert.equal(parsed.fontWeight, 600);
    });

    it('converts typography value to safe CSS', () => {
      const val: TypographyValue = {
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 1.4,
        letterSpacing: 0.5,
        textAlign: 'left',
        color: '#0f172a',
      };
      const css = typographyToCSS(val);
      assert.deepEqual(css, {
        fontFamily: 'Inter',
        fontSize: '18px',
        fontWeight: 'bold',
        lineHeight: '1.4',
        letterSpacing: '0.5px',
        textAlign: 'left',
        color: '#0f172a',
      });
    });
  });

  describe('Border', () => {
    it('validates border and individual side widths/radii', () => {
      const val: BorderValue = {
        style: 'solid',
        width: { top: 1, right: 2, bottom: 1, left: 2 },
        color: '#e2e8f0',
        radius: { topLeft: 4, topRight: 4, bottomRight: 0, bottomLeft: 0 },
      };
      const parsed = borderSchema.parse(val);
      assert.equal(parsed.style, 'solid');
    });

    it('converts border value to CSS with all sides or separate sides', () => {
      const uniform: BorderValue = {
        style: 'dashed',
        width: 2,
        color: '#dc2626',
        radius: 8,
      };
      assert.deepEqual(borderToCSS(uniform), {
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: '#dc2626',
        borderRadius: '8px',
      });

      const sides: BorderValue = {
        style: 'solid',
        width: { top: '1px', bottom: '2px' },
        radius: { topLeft: '4px', bottomRight: '8px' },
      };
      assert.deepEqual(borderToCSS(sides), {
        borderStyle: 'solid',
        borderTopWidth: '1px',
        borderBottomWidth: '2px',
        borderTopLeftRadius: '4px',
        borderBottomRightRadius: '8px',
      });
    });
  });

  describe('Shadow', () => {
    it('validates single shadow and multi-shadow lists', () => {
      const single = shadowSchema.parse({
        x: 0,
        y: 4,
        blur: 10,
        spread: -2,
        color: 'rgba(0,0,0,0.1)',
        inset: false,
      });
      assert.ok(!Array.isArray(single));

      const multi = shadowSchema.parse([
        { x: 0, y: 1, blur: 2, color: 'rgba(0,0,0,0.05)' },
        { x: 0, y: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)', inset: true },
      ]);
      assert.ok(Array.isArray(multi));
      assert.equal((multi as ShadowValue[]).length, 2);
    });

    it('formats box-shadow and text-shadow', () => {
      const box = shadowToCSS({
        x: 2,
        y: 4,
        blur: 6,
        spread: 1,
        color: '#000000',
        inset: true,
      }, 'box');
      assert.equal(box.boxShadow, 'inset 2px 4px 6px 1px #000000');

      const text = shadowToCSS({
        x: 1,
        y: 2,
        blur: 3,
        color: '#ff0000',
      }, 'text');
      assert.equal(text.textShadow, '1px 2px 3px #ff0000');
    });
  });

  describe('Background', () => {
    it('formats solid color, gradient, and image', () => {
      const solid: BackgroundValue = {
        type: 'color',
        color: '#3b82f6',
      };
      assert.deepEqual(backgroundToCSS(solid), {
        backgroundColor: '#3b82f6',
      });

      const grad: BackgroundValue = {
        type: 'gradient',
        gradient: {
          type: 'linear',
          angle: 180,
          stops: [
            { color: '#ffffff', offset: 0 },
            { color: '#000000', offset: 100 },
          ],
        },
      };
      assert.deepEqual(backgroundToCSS(grad), {
        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #000000 100%)',
      });

      const img: BackgroundValue = {
        type: 'image',
        image: {
          url: 'https://example.com/hero.jpg',
          size: 'cover',
          position: 'center',
          repeat: 'no-repeat',
        },
      };
      assert.deepEqual(backgroundToCSS(img), {
        backgroundImage: 'url("https://example.com/hero.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      });
    });
  });

  describe('Flex Container & Alignment', () => {
    it('converts flex container config to CSS', () => {
      const flex: FlexContainerValue = {
        display: 'flex',
        direction: 'row',
        wrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      };
      assert.deepEqual(flexContainerToCSS(flex), {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      });
    });
  });

  describe('CSS Whitelist & Injection Prevention', () => {
    it('sanitizes and blocks injection attempts', () => {
      assert.equal(sanitizeCssValue('javascript:alert(1)'), null);
      assert.equal(sanitizeCssValue('expression(alert(1))'), null);
      assert.equal(sanitizeCssValue('@import url("evil.css")'), null);
      assert.equal(sanitizeCssValue('red; background: black'), null);
      assert.equal(sanitizeCssValue('12px'), '12px');
    });

    it('filters out unallowlisted CSS properties', () => {
      const unallowlisted = {
        fontFamily: 'sans-serif',
        position: 'fixed', // not in ALLOWED_CSS_PROPERTIES
        zIndex: '999999', // not in ALLOWED_CSS_PROPERTIES
      };
      const filtered = filterAllowedCss(unallowlisted);
      assert.deepEqual(filtered, {
        fontFamily: 'sans-serif',
      });
    });
  });
});
