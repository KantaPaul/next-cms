import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DropZone, MarqueeBox, OverlayNotice } from '../overlays/CanvasMarks';
import { FloatingToolbar } from '../overlays/FloatingToolbar';
import { ResizeHandle } from '../overlays/ResizeHandle';

const box = { top: 100, left: 20, width: 300, height: 80 };

describe('FloatingToolbar generic mode (B15 E5)', () => {
  it('is a named toolbar with a drag handle, the label and every action', () => {
    const html = renderToStaticMarkup(
      <FloatingToolbar
        top={box.top}
        left={box.left}
        label="Hero"
        dragHandle={{ label: 'Drag Hero', onPointerDown: () => {} }}
        actions={[
          {
            id: 'dup',
            label: 'Duplicate',
            shortcut: '⌘D',
            icon: <i />,
            onClick: () => {},
          },
          {
            id: 'del',
            label: 'Delete',
            icon: <i />,
            onClick: () => {},
            danger: true,
          },
        ]}
      />
    );
    assert.match(html, /role="toolbar" aria-label="Hero actions"/);
    assert.match(html, /aria-label="Drag Hero"/);
    assert.match(html, />Hero</);
    assert.match(html, /aria-label="Duplicate"/);
    assert.match(html, /aria-label="Delete"/);
    // 32px above the box when placed above.
    assert.match(html, /top:68px/);
  });

  it('goes inside the top edge when placed below', () => {
    const html = renderToStaticMarkup(
      <FloatingToolbar
        top={10}
        left={0}
        label="Hero"
        placement="below"
        actions={[]}
      />
    );
    assert.match(html, /top:14px/);
  });

  it('keeps the legacy fixed buttons working', () => {
    const html = renderToStaticMarkup(
      <FloatingToolbar
        top={100}
        left={0}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    );
    assert.match(html, /aria-label="Duplicate"/);
    assert.match(html, /aria-label="Delete"/);
    assert.match(html, /top:64px/);
  });
});

describe('ResizeHandle (B15 E5)', () => {
  it('is a labelled slider on the edge, with its range and value text', () => {
    const html = renderToStaticMarkup(
      <ResizeHandle
        edge="right"
        rect={box}
        label="Width"
        valueText="50%"
        value={50}
        min={10}
        max={100}
      />
    );
    assert.match(
      html,
      /role="slider" aria-label="Width" aria-valuenow="50" aria-valuemin="10" aria-valuemax="100" aria-valuetext="50%"/
    );
    assert.match(html, /left:308px/);
    assert.doesNotMatch(html, /font-mono/);
  });

  it('shows the value badge only while active', () => {
    const html = renderToStaticMarkup(
      <ResizeHandle
        edge="bottom"
        rect={box}
        label="Spacing"
        valueText="48px"
        active
      />
    );
    assert.match(html, /aria-orientation="vertical"/);
    assert.match(html, />48px</);
  });
});

describe('Canvas marks (B15 E5)', () => {
  it('draws the drop zone and marquee at their bounds, hidden from assistive tech', () => {
    for (const html of [
      renderToStaticMarkup(<DropZone bounds={box} />),
      renderToStaticMarkup(<MarqueeBox bounds={box} />),
    ]) {
      assert.match(html, /aria-hidden="true"/);
      assert.match(html, /top:100px;left:20px;width:300px;height:80px/);
    }
  });

  it('announces a notice politely', () => {
    const html = renderToStaticMarkup(
      <OverlayNotice tone="danger">Can’t drop here</OverlayNotice>
    );
    assert.match(html, /role="status" aria-live="polite"/);
    assert.match(html, /bg-\[var\(--ne-danger\)\]/);
  });
});
