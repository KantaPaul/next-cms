/**
 * Regression tests: the Container's slot wrapper (which holds the child
 * blocks) must carry the layout CSS variables itself, because the `--s-c-*`
 * variables are registered with `inherits:false`.
 *
 * Run with: npx tsx --test src/builder/__tests__/container-slot.test.tsx
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement, type CSSProperties } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pickLayoutVars, renderContainerBody } from '../blocks/container';
import { ResponsiveTrackInput } from '../controls/container';
import { normalizeContainerSettings, type ContainerSettings } from '../style';

type SlotOptions = { className?: string; style?: CSSProperties };

function captureSlot(container: ContainerSettings): SlotOptions {
  let captured: SlotOptions | undefined;
  const content = (opts: SlotOptions) => {
    captured = opts;
    return null;
  };
  renderContainerBody({
    p: { content: content as never, container },
    c: normalizeContainerSettings(container),
    device: 'desktop',
    editorNotes: [],
  });
  assert.ok(captured, 'slot function was called');
  return captured;
}

describe('Container slot wrapper', () => {
  const settings: ContainerSettings = {
    direction: { desktop: 'column', mobile: 'row' },
    justify: { desktop: 'end' },
    gap: { desktop: 24 },
    width: { desktop: 50 },
    sizeUnit: '%',
  };

  it('gets the layout variables for every breakpoint', () => {
    const style = captureSlot(settings).style as Record<string, unknown>;
    assert.equal(style['--s-c-fd-d'], 'column');
    assert.equal(style['--s-c-fd-m'], 'row');
    assert.equal(style['--s-c-jc-d'], 'end');
    assert.match(String(style['--s-c-ga-d']), /24/);
  });

  it('gets the layout classes and keeps its fill styles', () => {
    const slot = captureSlot(settings);
    const classes = (slot.className ?? '').split(' ');
    assert.ok(classes.includes('s-c-fd'));
    assert.ok(classes.includes('s-c-jc'));
    assert.equal(slot.style?.width, '100%');
    assert.equal(slot.style?.gridRow, '1 / -1');
  });

  it('does not get sizing variables meant for the outer box', () => {
    const style = captureSlot(settings).style as Record<string, unknown>;
    assert.ok(
      !Object.keys(style).some(k => k.startsWith('--s-c-w-')),
      'width variable stays on the outer element'
    );
  });
});

describe('pickLayoutVars', () => {
  it('keeps gap and grid auto-flow variables apart', () => {
    const picked = pickLayoutVars({
      '--s-c-ga-d': '8px',
      '--s-c-gaf-d': 'dense',
      '--s-c-xw-d': '900px',
      color: 'red',
    } as CSSProperties);
    assert.deepEqual(picked, { '--s-c-ga-d': '8px', '--s-c-gaf-d': 'dense' });
  });
});

describe('Grid track input', () => {
  it('shows the saved track value instead of an empty field', () => {
    const html = renderToStaticMarkup(
      createElement(ResponsiveTrackInput, {
        label: 'Columns',
        value: { desktop: 'repeat(3, 1fr)' },
        onChange: () => {},
      })
    );
    assert.match(html, /value="repeat\(3, 1fr\)"/);
  });
});

describe('Flex-item classes and styles', () => {
  it('places s-c-grw, s-c-grs, and s-c-grb on the outer section, not .s-cntr', () => {
    const html = renderToStaticMarkup(
      renderContainerBody({
        p: {
          container: {
            grow: { desktop: 2 },
            shrink: { desktop: 0 },
            basis: { desktop: 160 },
            basisUnit: 'px',
          },
        },
        c: normalizeContainerSettings({
          grow: { desktop: 2 },
          shrink: { desktop: 0 },
          basis: { desktop: 160 },
          basisUnit: 'px',
        }),
        device: 'desktop',
        editorNotes: [],
      })
    );

    const sectionMatch = html.match(/<section\b([^>]*)>/);
    assert.ok(sectionMatch, 'outer section exists');
    const sectionAttrs = sectionMatch[1];
    assert.match(sectionAttrs, /\bs-c-grw\b/);
    assert.match(sectionAttrs, /\bs-c-grs\b/);
    assert.match(sectionAttrs, /\bs-c-grb\b/);
    assert.match(sectionAttrs, /--s-c-grw-d:2/);
    assert.match(sectionAttrs, /--s-c-grs-d:0/);
    assert.match(sectionAttrs, /--s-c-grb-d:160px/);

    const cntrMatch = html.match(/<div\b([^>]*\bs-cntr\b[^>]*)>/);
    assert.ok(cntrMatch, '.s-cntr element exists');
    const cntrAttrs = cntrMatch[1];
    assert.doesNotMatch(cntrAttrs, /\bs-c-grw\b/);
    assert.doesNotMatch(cntrAttrs, /\bs-c-grs\b/);
    assert.doesNotMatch(cntrAttrs, /\bs-c-grb\b/);
    assert.doesNotMatch(cntrAttrs, /--s-c-gr[wsb]-/);
  });
});
