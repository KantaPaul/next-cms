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

  it('maps _widescreen, _laptop, _tablet_extra, _tablet, _mobile_extra, and _mobile suffixes', () => {
    const payload = [
      {
        id: 'c1',
        elType: 'container',
        settings: {
          flex_direction: 'row',
          flex_direction_laptop: 'row',
          flex_direction_tablet_extra: 'column',
          flex_direction_mobile_extra: 'column-reverse',
          flex_gap: { size: 32, unit: 'px' },
          flex_gap_widescreen: { size: 48, unit: 'px' },
          flex_gap_tablet: { size: 20, unit: 'px' },
          hide_laptop: 'yes',
          hide_mobile_extra: 'yes',
          _padding_widescreen: { top: 80, right: 0, bottom: 80, left: 0, unit: 'px' },
          _padding_laptop: { top: 48, right: 0, bottom: 48, left: 0, unit: 'px' },
        },
        elements: [
          {
            id: 'h1',
            elType: 'widget',
            widgetType: 'heading',
            settings: {
              title: 'Multi-device Title',
              typography_font_size: { size: 48, unit: 'px' },
              typography_font_size_widescreen: { size: 64, unit: 'px' },
              typography_font_size_laptop: { size: 40, unit: 'px' },
              typography_font_size_tablet_extra: { size: 36, unit: 'px' },
              typography_font_size_tablet: { size: 32, unit: 'px' },
              typography_font_size_mobile_extra: { size: 28, unit: 'px' },
              typography_font_size_mobile: { size: 24, unit: 'px' },
            },
          },
        ],
      },
    ];
    const result = convertElementorToDocument(payload, { validate: documentIssues });
    assert.equal(result.valid, true, `Validation issues: ${result.issues.join('; ')}`);

    const nodes = Object.values(result.document.nodes);
    const container = nodes.find(n => n.type === 'Container');
    assert.ok(container);
    const contProps = container.props as {
      container: Record<string, any>;
      section: Record<string, any>;
    };
    assert.deepEqual(contProps.container.direction, {
      desktop: 'row',
      laptop: 'row',
      tablet_extra: 'column',
      mobile_extra: 'column-reverse',
    });
    assert.deepEqual(contProps.container.gap, {
      widescreen: 48,
      desktop: 32,
      tablet: 20,
    });
    assert.deepEqual(contProps.section.hideOn, ['laptop', 'mobile_extra']);
    assert.deepEqual(contProps.section.spacing, {
      widescreen: { top: 80, right: 0, bottom: 80, left: 0 },
      laptop: { top: 48, right: 0, bottom: 48, left: 0 },
    });

    const heading = nodes.find(n => n.type === 'Heading');
    assert.ok(heading);
    const fontSize = (heading.props as any).elements?.heading?.typography?.fontSize;
    assert.deepEqual(fontSize, {
      widescreen: 64,
      desktop: 48,
      laptop: 40,
      tablet_extra: 36,
      tablet: 32,
      mobile_extra: 28,
      mobile: 24,
    });
  });
});
