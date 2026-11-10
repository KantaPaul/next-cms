import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { documentIssues } from '@/builder/validate-document';
import { convertElementorToDocument } from '../elementor';

const fixtureJson = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'src/server/import/__tests__/fixtures/elementor-all-widgets.json'
    ),
    'utf8'
  )
);

describe('Elementor converter', () => {
  it('converts all mapped Elementor widgets, containers, and columns into a valid BuilderDocument', () => {
    const result = convertElementorToDocument(fixtureJson, {
      pageTitle: 'Showcase',
      validate: documentIssues,
    });

    assert.equal(result.valid, true, `Validation issues: ${result.issues.join('; ')}`);
    assert.deepEqual(result.issues, []);

    const nodeTypes = new Set(
      Object.values(result.document.nodes).map(n => n.type)
    );

    const expectedBlocks = [
      'Container',
      'Columns',
      'Column',
      'Heading',
      'RichText',
      'Image',
      'ImageBox',
      'Icon',
      'IconBox',
      'Button',
      'Spacer',
      'Divider',
      'Counter',
      'ProgressBar',
      'StarRating',
      'Countdown',
      'FlipBox',
      'AnimatedHeadline',
      'PriceList',
      'TableOfContents',
      'TestimonialCarousel',
      'Hotspot',
      'Lottie',
      'Accordion',
      'Tabs',
      'Video',
      'Map',
      'Gallery',
      'ContactForm',
    ];

    for (const block of expectedBlocks) {
      assert.ok(nodeTypes.has(block), `Expected block type ${block} in converted document`);
    }

    // Unknown widget becomes RichText + produces a warning
    assert.deepEqual(result.fallbackWidgets, ['custom-third-party-widget']);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0]?.includes('custom-third-party-widget'));
    assert.ok(result.warnings[0]?.includes('Showcase'));

    // ContactForm mapped fields including step & acceptance
    const formNode = Object.values(result.document.nodes).find(
      n => n.type === 'ContactForm'
    );
    assert.ok(formNode);
    const fields = formNode.props.fields as Array<{ type: string; name: string }>;
    assert.equal(fields.filter(f => f.type === 'step').length, 2);
    assert.ok(fields.some(f => f.type === 'acceptance'));
  });

  it('sanitizes dangerous scripts inside Elementor text-editor widgets and strips javascript: links', () => {
    const payload = [
      {
        id: 's1',
        elType: 'container',
        settings: {},
        elements: [
          {
            id: 'w1',
            elType: 'widget',
            widgetType: 'text-editor',
            settings: { editor: '<p>Safe</p><script>evil()</script>' },
          },
          {
            id: 'w2',
            elType: 'widget',
            widgetType: 'button',
            settings: { text: 'Click', link: { url: 'javascript:alert(1)' } },
          },
        ],
      },
    ];
    const result = convertElementorToDocument(payload, { validate: documentIssues });
    assert.equal(result.valid, true);
    const rt = Object.values(result.document.nodes).find(n => n.type === 'RichText');
    assert.equal((rt?.props.content as string).includes('<script>'), false);
    const btn = Object.values(result.document.nodes).find(n => n.type === 'Button');
    assert.equal(btn?.props.link, '#');
  });
});
