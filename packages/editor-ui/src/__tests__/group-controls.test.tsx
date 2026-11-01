import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlignmentPad } from '../controls/AlignmentPad';
import { GradientEditor } from '../controls/GradientEditor';
import { ShadowEditor } from '../controls/ShadowEditor';
import { BackgroundGroup } from '../controls/groups/BackgroundGroup';
import { BorderGroup } from '../controls/groups/BorderGroup';
import { FlexContainerGroup } from '../controls/groups/FlexContainerGroup';
import { TypographyGroup } from '../controls/groups/TypographyGroup';

describe('Group Controls & Visual Editors (E12f/g)', () => {
  describe('AlignmentPad', () => {
    it('renders 3x3 matrix and justify/align option radios', () => {
      const html = renderToStaticMarkup(
        <AlignmentPad
          value={{ justify: 'center', align: 'center' }}
          onChange={() => {}}
        />
      );

      assert.match(html, /aria-label="Alignment grid"/);
      assert.match(html, /aria-label="Justify content"/);
      assert.match(html, /aria-label="Align items"/);
      assert.match(html, /Top Left/);
      assert.match(html, /Center/);
      assert.match(html, /Bottom Right/);
    });

    it('renders with custom label inside a ControlRow', () => {
      const html = renderToStaticMarkup(
        <AlignmentPad
          label="Content Alignment"
          value={{ justify: 'start', align: 'start' }}
          onChange={() => {}}
        />
      );

      assert.match(html, /Content Alignment/);
    });
  });

  describe('ShadowEditor', () => {
    it('renders box shadow with live preview box and fields', () => {
      const html = renderToStaticMarkup(
        <ShadowEditor
          type="box"
          value={{
            x: 0,
            y: 4,
            blur: 10,
            spread: 2,
            color: 'rgba(0,0,0,0.2)',
            inset: false,
          }}
          onChange={() => {}}
        />
      );

      assert.match(html, /aria-label="Shadow preview"/);
      assert.match(html, /Box Shadow/);
      assert.match(html, /X Offset/);
      assert.match(html, /Y Offset/);
      assert.match(html, /Blur/);
      assert.match(html, /Spread/);
      assert.match(html, /Shadow Color/);
      assert.match(html, /Inset Shadow/);
      assert.match(html, /Subtle/);
      assert.match(html, /Medium/);
    });

    it('renders text shadow without spread or inset controls', () => {
      const html = renderToStaticMarkup(
        <ShadowEditor
          type="text"
          value={{
            x: 1,
            y: 2,
            blur: 3,
            color: '#333333',
          }}
          onChange={() => {}}
        />
      );

      assert.match(html, /Text Shadow/);
      assert.match(html, /Abc/);
      assert.doesNotMatch(html, /Spread/);
      assert.doesNotMatch(html, /Inset Shadow/);
    });
  });

  describe('GradientEditor', () => {
    it('renders gradient preview track, stop pins, angle slider, and active stop controls', () => {
      const html = renderToStaticMarkup(
        <GradientEditor
          value={{
            type: 'linear',
            angle: 120,
            stops: [
              { color: '#ff0000', offset: 0 },
              { color: '#0000ff', offset: 100 },
            ],
          }}
          onChange={() => {}}
        />
      );

      assert.match(html, /aria-label="Gradient track preview"/);
      assert.match(html, /Stop 1 at 0%/);
      assert.match(html, /Stop 2 at 100%/);
      assert.match(html, /Sunset/);
      assert.match(html, /Ocean/);
    });
  });

  describe('TypographyGroup', () => {
    it('renders inside GroupControl with typography controls and presets', () => {
      const html = renderToStaticMarkup(
        <TypographyGroup
          value={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 18,
            fontWeight: '600',
            lineHeight: 1.4,
            letterSpacing: 0,
            textAlign: 'center',
            color: '#111827',
          }}
          onChange={() => {}}
          defaultOpen={true}
        />
      );

      assert.match(html, /Typography/);
      assert.match(html, /Font Family/);
      assert.match(html, /Size/);
      assert.match(html, /Weight/);
      assert.match(html, /Line Height/);
      assert.match(html, /Spacing/);
      assert.match(html, /Align/);
      assert.match(html, /H1 32px/);
      assert.match(html, /Body 14px/);
    });
  });

  describe('BorderGroup', () => {
    it('renders inside GroupControl with border controls and presets', () => {
      const html = renderToStaticMarkup(
        <BorderGroup
          value={{
            style: 'solid',
            width: 2,
            color: '#3b82f6',
            radius: 8,
          }}
          onChange={() => {}}
          defaultOpen={true}
        />
      );

      assert.match(html, /Border/);
      assert.match(html, /Style/);
      assert.match(html, /Width/);
      assert.match(html, /Color/);
      assert.match(html, /Radius/);
      assert.match(html, /Subtle 1px/);
      assert.match(html, /Pill Radius/);
    });
  });

  describe('BackgroundGroup', () => {
    it('renders solid color mode and presets', () => {
      const html = renderToStaticMarkup(
        <BackgroundGroup
          value={{
            type: 'color',
            color: '#ffffff',
          }}
          onChange={() => {}}
          defaultOpen={true}
        />
      );

      assert.match(html, /Background/);
      assert.match(html, /Mode/);
      assert.match(html, /Solid/);
      assert.match(html, /Background Color/);
      assert.match(html, /White/);
      assert.match(html, /Surface/);
    });

    it('renders gradient mode with GradientEditor embedded', () => {
      const html = renderToStaticMarkup(
        <BackgroundGroup
          value={{
            type: 'gradient',
            gradient: {
              type: 'linear',
              angle: 90,
              stops: [
                { color: '#f97316', offset: 0 },
                { color: '#ec4899', offset: 100 },
              ],
            },
          }}
          onChange={() => {}}
          defaultOpen={true}
        />
      );

      assert.match(html, /aria-label="Gradient track preview"/);
    });
  });

  describe('FlexContainerGroup', () => {
    it('renders flex direction, wrap, display, AlignmentPad, and gap', () => {
      const html = renderToStaticMarkup(
        <FlexContainerGroup
          value={{
            display: 'flex',
            direction: 'row',
            wrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
          }}
          onChange={() => {}}
          defaultOpen={true}
        />
      );

      assert.match(html, /Flex Container/);
      assert.match(html, /Direction/);
      assert.match(html, /Wrap/);
      assert.match(html, /Display/);
      assert.match(html, /Gap/);
      assert.match(html, /Row Center/);
      assert.match(html, /Col Stack/);
      assert.match(html, /aria-label="Alignment grid"/);
    });
  });
});
