import assert from 'node:assert';
import { describe, it } from 'node:test';
import { animationSchema } from '../schemas/style.schema';
import { resolveElementStyle, resolveSectionStyle } from '../style';

describe('controls-regressions (Phase 1)', () => {
  describe('border style class emission', () => {
    it('emits s-bd-${style} for section styles', () => {
      const res = resolveSectionStyle({
        border: {
          style: 'solid',
          color: '#0f5d4a',
          width: { desktop: { top: 1, bottom: 1, left: 1, right: 1 } },
        },
      });

      assert.ok(
        res.outerClasses.includes('s-bd-solid'),
        `Expected s-bd-solid, got: ${res.outerClasses.join(' ')}`
      );
      assert.ok(
        !res.outerClasses.includes('s-bd'),
        's-bd without style should not be emitted'
      );
      assert.equal((res.style as any)['--s-bd-color'], '#0f5d4a');
    });

    it('emits s-bd-${style} for element styles', () => {
      const res = resolveElementStyle({
        border: {
          style: 'dashed',
          color: '#705d49',
          width: { desktop: { top: 2, bottom: 2, left: 2, right: 2 } },
        },
      });

      assert.ok(
        res.classes.includes('s-bd-dashed'),
        `Expected s-bd-dashed, got: ${res.classes.join(' ')}`
      );
      assert.ok(
        !res.classes.includes('s-bd'),
        's-bd without style should not be emitted'
      );
      assert.equal((res.style as any)['--s-bd-color'], '#705d49');
    });
  });

  describe('border radius emission', () => {
    it('emits s-rad and --s-rad-* instead of s-br for section border radius', () => {
      const res = resolveSectionStyle({
        border: {
          radius: { desktop: 16, mobile: 8 },
          radiusUnit: 'px',
        },
      });

      assert.ok(
        res.outerClasses.includes('s-rad'),
        `Expected s-rad in classes, got: ${res.outerClasses.join(' ')}`
      );
      assert.ok(
        !res.outerClasses.includes('s-br'),
        's-br is border-right-width, must not be used for border-radius'
      );

      const style = res.style as Record<string, string>;
      assert.equal(style['--s-rad-d'], '16px');
      assert.equal(style['--s-rad-m'], '8px');
    });

    it('emits s-rad and --s-rad-* instead of s-br for element border radius', () => {
      const res = resolveElementStyle({
        border: {
          radius: { desktop: 12, mobile: 6 },
          radiusUnit: 'px',
        },
      });

      assert.ok(
        res.classes.includes('s-rad'),
        `Expected s-rad in classes, got: ${res.classes.join(' ')}`
      );
      assert.ok(
        !res.classes.includes('s-br'),
        's-br is border-right-width, must not be used for border-radius'
      );

      const style = res.style as Record<string, string>;
      assert.equal(style['--s-rad-d'], '12px');
      assert.equal(style['--s-rad-m'], '6px');
    });

    it('preserves s-br for right border width when border width is configured', () => {
      const res = resolveSectionStyle({
        border: {
          style: 'solid',
          width: { desktop: { right: 4 } },
        },
      });

      assert.ok(
        res.outerClasses.includes('s-br'),
        's-br must be emitted for border-right-width'
      );
      const style = res.style as Record<string, string>;
      assert.equal(style['--s-br-d'], '4px');
    });
  });

  describe('CSS Filter & Hover Filter resolution', () => {
    it('resolves flat filter and hover filter on section', () => {
      const res = resolveSectionStyle({
        filter: { blur: 4, grayscale: 50 },
        hover: {
          filter: { blur: 0, grayscale: 0 },
        },
      });

      assert.ok(res.outerClasses.includes('s-filter'));
      assert.ok(res.outerClasses.includes('s-hfl'));
      const style = res.style as Record<string, string>;
      assert.ok(style['--s-filter'].includes('blur(4px)'));
      assert.ok(style['--s-h-filter'].includes('blur(0px)'));
    });

    it('handles legacy nested { normal, hover } filter object on section gracefully', () => {
      const res = resolveSectionStyle({
        filter: {
          normal: { blur: 8 },
          hover: { blur: 2 },
        } as any,
      });

      assert.ok(res.outerClasses.includes('s-filter'));
      assert.ok(res.outerClasses.includes('s-hfl'));
      const style = res.style as Record<string, string>;
      assert.ok(style['--s-filter'].includes('blur(8px)'));
      assert.ok(style['--s-h-filter'].includes('blur(2px)'));
    });
  });

  describe('animation schema milliseconds validation', () => {
    it('accepts duration, delay, and stagger in milliseconds (0-5000ms)', () => {
      const parsed = animationSchema.safeParse({
        entrance: 'fadeInUp',
        duration: 800,
        delay: 200,
        stagger: 150,
      });

      assert.ok(parsed.success, `Schema validation failed: ${JSON.stringify(parsed.error?.issues)}`);
      if (parsed.success) {
        assert.equal(parsed.data.duration, 800);
        assert.equal(parsed.data.delay, 200);
        assert.equal(parsed.data.stagger, 150);
      }
    });

    it('rejects duration or stagger over the allowed limits', () => {
      const overDuration = animationSchema.safeParse({ duration: 6000 });
      assert.ok(!overDuration.success);

      const overStagger = animationSchema.safeParse({ stagger: 2500 });
      assert.ok(!overStagger.success);
    });
  });

  describe('Phase 3 — Controls: Add / Remove', () => {
    it('resolves section box shadow and hover shadow', () => {
      const res = resolveSectionStyle({
        shadow: {
          x: 0,
          y: 4,
          blur: 12,
          spread: -2,
          color: '#000000',
          opacity: 0.1,
        },
        hover: {
          shadow: {
            x: 0,
            y: 8,
            blur: 24,
            spread: -4,
            color: '#000000',
            opacity: 0.2,
          },
        },
      });

      assert.ok(res.outerClasses.includes('s-shadow'), 'Should emit s-shadow');
      assert.ok(res.outerClasses.includes('s-hs'), 'Should emit s-hs for hover');
      const style = res.style as Record<string, string>;
      assert.ok(style['--s-shadow'], 'Should have --s-shadow');
      assert.ok(style['--s-h-shadow'], 'Should have --s-h-shadow');
    });

    it('resolves backdrop blur and fill opacity to s-glass and variables', () => {
      const res = resolveSectionStyle({
        fill: {
          type: 'color',
          color: '#fef9f1',
          opacity: 0.8,
          backdropBlur: 20,
        },
      });

      assert.ok(res.outerClasses.includes('s-fill'));
      assert.ok(res.outerClasses.includes('s-glass'));
      const style = res.style as Record<string, string>;
      assert.equal(style['--s-backdrop-blur'], '20px');
      assert.equal(style['--s-bg-opacity'], '0.8');
      assert.ok(style['--s-fill'].includes('0.8'));
    });

    it('resolves hover lift (scale & opacity) to s-hlift and variables', () => {
      const res = resolveSectionStyle({
        hover: {
          scale: 1.03,
          opacity: 0.95,
        },
      });

      assert.ok(res.outerClasses.includes('s-hlift'), 'Should emit s-hlift');
      const style = res.style as Record<string, string>;
      assert.equal(style['--s-h-scale'], '1.03');
      assert.equal(style['--s-h-opacity'], '0.95');

      const elRes = resolveElementStyle({
        hover: {
          scale: 1.05,
          opacity: 0.9,
        },
      });
      assert.ok(elRes.classes.includes('s-hlift'));
      const elStyle = elRes.style as Record<string, string>;
      assert.equal(elStyle['--s-h-scale'], '1.05');
      assert.equal(elStyle['--s-h-opacity'], '0.9');
    });

    it('emits s-type-${preset} class for typography presets', () => {
      const res = resolveSectionStyle({
        typography: {
          preset: 'h2',
        },
      });
      assert.ok(res.outerClasses.includes('s-type-h2'));

      const elRes = resolveElementStyle({
        typography: {
          preset: 'display',
        },
      });
      assert.ok(elRes.classes.includes('s-type-display'));
    });
  });
});
