import assert from 'node:assert';
import { describe, it } from 'node:test';
import { validateDocumentProps } from '@nextcms/builder-core';
import { pageDefinitions } from '../definitions';
import { safeUrlSchema } from '../schemas/style.schema';

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
});
