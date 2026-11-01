import assert from 'node:assert';
import { describe, it } from 'node:test';
import { validateDocumentProps } from '@nextcms/builder-core';
import { pageDefinitions } from '../definitions';
import {
  fillSchema,
  filterSchema,
  imageSizeSchema,
  safeUrlSchema,
  textStrokeSchema,
  typographySchema,
} from '../schemas/style.schema';

describe('Validation (style & content schemas)', () => {
  it('rejects javascript: and dangerous protocols in URLs', () => {
    assert.equal(safeUrlSchema.safeParse('javascript:alert(1)').success, false);
    assert.equal(safeUrlSchema.safeParse('JAVASCRIPT:alert(1)').success, false);
    assert.equal(safeUrlSchema.safeParse('data:text/html;base64,...').success, false);
    assert.equal(safeUrlSchema.safeParse('vbscript:msgbox').success, false);
    assert.equal(safeUrlSchema.safeParse('https://example.com').success, true);
    assert.equal(safeUrlSchema.safeParse('/pricing').success, true);
    assert.equal(safeUrlSchema.safeParse('#contact').success, true);
  });

  it('validates document props against real definitions with validateDocumentProps', () => {
    const validDoc = {
      root: { props: {} },
      nodes: {
        node1: {
          id: 'node1',
          type: 'Hero',
          props: {
            title: 'Welcome',
            alignment: 'center',
            section: { paddingY: 'md' },
          },
          slots: {},
        },
      },
    };

    const issues = validateDocumentProps(validDoc as any, pageDefinitions);
    assert.deepEqual(issues, {});
  });

  it('surfaces errors for invalid prop values with validateDocumentProps', () => {
    const invalidDoc = {
      root: { props: {} },
      nodes: {
        node1: {
          id: 'node1',
          type: 'Hero',
          props: {
            title: 'Welcome',
            primaryButtonLink: 'javascript:alert(1)',
          },
          slots: {},
        },
      },
    };

    const issues = validateDocumentProps(invalidDoc as any, pageDefinitions);
    assert.ok(Object.keys(issues).some(k => k.startsWith('node1')));
  });

  describe('group control schemas', () => {
    it('validates textStrokeSchema', () => {
      assert.equal(
        textStrokeSchema.safeParse({ width: 2, color: '#ff0000' }).success,
        true
      );
      assert.equal(
        textStrokeSchema.safeParse({
          width: { desktop: 3, mobile: 1 },
          color: 'rgba(0, 0, 0, 0.5)',
        }).success,
        true
      );
      assert.equal(textStrokeSchema.safeParse({ width: -5 }).success, false);
    });

    it('validates imageSizeSchema', () => {
      assert.equal(
        imageSizeSchema.safeParse({ size: 'thumbnail' }).success,
        true
      );
      assert.equal(
        imageSizeSchema.safeParse({ size: 'custom', width: 800, height: 600 }).success,
        true
      );
      assert.equal(
        imageSizeSchema.safeParse({ size: 'nonexistent' as any }).success,
        false
      );
    });

    it('validates filterSchema with grayscale', () => {
      assert.equal(
        filterSchema.safeParse({ grayscale: 50, blur: 2, contrast: 110 }).success,
        true
      );
      assert.equal(
        filterSchema.safeParse({ grayscale: 150 }).success,
        false
      );
    });

    it('validates typographySchema with numeric weight and word spacing', () => {
      assert.equal(
        typographySchema.safeParse({
          fontWeight: 600,
          family: 'Inter',
          wordSpacing: { desktop: 2 },
        }).success,
        true
      );
      assert.equal(
        typographySchema.safeParse({
          weight: { desktop: 700, mobile: 400 },
        }).success,
        true
      );
      assert.equal(
        typographySchema.safeParse({ fontWeight: 50 }).success,
        false
      );
    });

    it('validates fillSchema with video and gradient options', () => {
      assert.equal(
        fillSchema.safeParse({
          type: 'video',
          videoUrl: 'https://cdn.example.com/bg.mp4',
          videoFallback: 'https://cdn.example.com/fallback.jpg',
        }).success,
        true
      );
      assert.equal(
        fillSchema.safeParse({
          type: 'gradient',
          gradientType: 'radial',
          gradientPosition: 'center center',
        }).success,
        true
      );
    });
  });
});
