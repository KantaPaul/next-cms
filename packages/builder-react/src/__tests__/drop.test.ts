import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  dropIndex,
  dropIndexWithHysteresis,
  dropLine,
  toolbarX,
  type Rect,
} from '../drop';
import { hoverInsertTarget, NODE_ATTR, SLOT_ATTR, SLOT_NAME_ATTR, SLOT_PARENT_ATTR } from '../dom';
import { clamp, isSnapped, type ResizeHandle } from '../resize';

describe('dropIndex hysteresis', () => {
  const children: Rect[] = [
    { left: 0, top: 0, width: 200, height: 100 }, // midpoint y = 50
    { left: 0, top: 100, width: 200, height: 100 }, // midpoint y = 150
  ];

  it('behaves like standard midpoint rule without previousIndex', () => {
    assert.equal(dropIndex(children, { x: 100, y: 40 }, 'y'), 0);
    assert.equal(dropIndex(children, { x: 100, y: 50 }, 'y'), 1);
    assert.equal(dropIndex(children, { x: 100, y: 140 }, 'y'), 1);
    assert.equal(dropIndex(children, { x: 100, y: 160 }, 'y'), 2);
  });

  it('keeps previousIndex = 0 while within 12px past the midpoint', () => {
    // midpoint is 50. hysteresis threshold is 50 + 12 = 62.
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 55 }, 'y', 0), 0);
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 62 }, 'y', 0), 0);
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 63 }, 'y', 0), 1);
  });

  it('keeps previousIndex = 1 while within 12px before the midpoint', () => {
    // midpoint is 50. hysteresis threshold is 50 - 12 = 38.
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 45 }, 'y', 1), 1);
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 38 }, 'y', 1), 1);
    assert.equal(dropIndexWithHysteresis(children, { x: 100, y: 37 }, 'y', 1), 0);
  });

  it('handles horizontal axis hysteresis', () => {
    const cols: Rect[] = [
      { left: 0, top: 0, width: 100, height: 200 }, // midpoint x = 50
      { left: 100, top: 0, width: 100, height: 200 }, // midpoint x = 150
    ];
    assert.equal(dropIndex(cols, { x: 55, y: 100 }, 'x', 0), 0);
    assert.equal(dropIndex(cols, { x: 65, y: 100 }, 'x', 0), 1);
  });
});

describe('toolbarX computation', () => {
  const bounds = { left: 0, right: 800, top: 0 };

  it('returns left if toolbar fits comfortably inside bounds', () => {
    const x = toolbarX({ left: 100, width: 200, bounds });
    assert.equal(x, 100);
  });

  it('flips to align with anchorRight when overflowing bounds.right', () => {
    // block left = 650, anchorRight = 750, toolbar width = 200.
    // left + width = 850 > 800 - 8 (792).
    // Flips to anchorRight - width = 750 - 200 = 550.
    const x = toolbarX({ left: 650, width: 200, anchorRight: 750, bounds });
    assert.equal(x, 550);
  });

  it('clamps to bounds.left + 8 if anchorRight - width is off-screen left', () => {
    const x = toolbarX({ left: 600, width: 300, anchorRight: 100, bounds });
    assert.equal(x, 8);
  });

  it('clamps to bounds.right - 8 - width if right edge still exceeds', () => {
    const x = toolbarX({ left: 700, width: 150, anchorRight: 800, bounds });
    // anchorRight - width = 650. Max allowed: 800 - 8 - 150 = 642.
    assert.equal(x, 642);
  });

  it('returns left without modification when no bounds are provided', () => {
    assert.equal(toolbarX({ left: 650, width: 200 }), 650);
  });
});

describe('snap clamp', () => {
  const pxHandle: ResizeHandle = {
    id: 'test-px',
    label: 'Padding',
    edge: 'bottom',
    unit: 'px',
    min: 0,
    max: 200,
    step: 2,
    snap: [0, 8, 16, 24, 32, 48, 64, 80, 96, 120, 160],
    read: () => undefined,
    write: () => ({}),
  };

  const pctHandle: ResizeHandle = {
    id: 'test-pct',
    label: 'Width',
    edge: 'right',
    unit: '%',
    min: 10,
    max: 100,
    step: 1,
    snap: [25, 33.33, 50, 66.67, 75, 100],
    read: () => undefined,
    write: () => ({}),
  };

  it('snaps px values within 4px of a snap point', () => {
    assert.equal(clamp(47, pxHandle), 48);
    assert.equal(clamp(49, pxHandle), 48);
    assert.equal(clamp(52, pxHandle), 48);
    assert.ok(isSnapped(48, pxHandle));
  });

  it('rounds by step when outside 4px snap threshold', () => {
    // 41 is diff 7 from 48 and diff 9 from 32, rounds by step 2 to 42
    assert.equal(clamp(41, pxHandle), 42);
    assert.ok(!isSnapped(42, pxHandle));
  });

  it('disables snapping when Alt key is held', () => {
    // 47 rounds to 48 by step 2, but isSnapped is false because snapping was disabled
    assert.equal(clamp(47, pxHandle, { altKey: true }), 48);
    assert.ok(!isSnapped(48, pxHandle, { altKey: true }));

    // For step 1 handle, 47 without snap is 47 instead of snapping to 48
    const step1Handle = { ...pxHandle, step: 1 };
    assert.equal(clamp(47, step1Handle, { altKey: true }), 47);
  });

  it('snaps percentage values within 1% threshold', () => {
    assert.equal(clamp(49.4, pctHandle), 50);
    assert.equal(clamp(50.8, pctHandle), 50);
    assert.ok(isSnapped(50, pctHandle));
  });

  it('respects min and max bounds', () => {
    assert.equal(clamp(-10, pxHandle), 0);
    assert.equal(clamp(250, pxHandle), 200);
  });
});

describe('hoverInsertTarget avoid shift', () => {
  function createMockDoc() {
    const slotRect = { left: 0, top: 0, width: 400, height: 600 };
    const childrenRects = [
      { left: 0, top: 0, width: 400, height: 100 },
      { left: 0, top: 100, width: 400, height: 100 },
    ];
    const children = childrenRects.map(r => ({
      hasAttribute: (attr: string) => attr === NODE_ATTR,
      getAttribute: () => 'node-1',
      children: [
        {
          getBoundingClientRect: () => ({
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height,
          }),
        },
      ],
    }));

    const slotElement = {
      getAttribute: (attr: string) => {
        if (attr === SLOT_PARENT_ATTR) return null;
        if (attr === SLOT_NAME_ATTR) return '';
        return null;
      },
      hasAttribute: (attr: string) => attr === SLOT_ATTR,
      closest: (selector: string) => (selector.includes(SLOT_ATTR) ? slotElement : null),
      children,
      getBoundingClientRect: () => ({
        left: slotRect.left,
        top: slotRect.top,
        width: slotRect.width,
        height: slotRect.height,
      }),
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            display: 'block',
            flexDirection: 'column',
          }),
        },
      },
    };

    return {
      elementFromPoint: () => slotElement,
    } as unknown as Document;
  }

  it('places button at gap centre when no avoid rects are provided', () => {
    const doc = createMockDoc();
    const hit = hoverInsertTarget(doc, { x: 200, y: 100 }, 10, []);
    assert.ok(hit);
    assert.equal(hit.buttonPoint.x, 200);
    assert.equal(hit.buttonPoint.y, 100);
    assert.deepEqual(hit.line, { left: 0, width: 400 });
  });

  it('shifts x to centre + 40px when center collides with an avoid rect', () => {
    const doc = createMockDoc();
    // Grip rect right at the centre (x: 186-214, y: 88-102)
    const gripRect: Rect = { left: 186, top: 88, width: 28, height: 14 };
    const hit = hoverInsertTarget(doc, { x: 200, y: 100 }, 10, [gripRect]);
    assert.ok(hit);
    // Center was 200; shifted to 200 + 40 = 240
    assert.equal(hit.buttonPoint.x, 240);
  });

  it('shifts x to centre - 40px when centre and centre + 40 are blocked', () => {
    const doc = createMockDoc();
    // Rect covering center and right side
    const toolbarRect: Rect = { left: 180, top: 80, width: 80, height: 40 };
    const hit = hoverInsertTarget(doc, { x: 200, y: 100 }, 10, [toolbarRect]);
    assert.ok(hit);
    // Center was 200; shifted to 200 - 40 = 160
    assert.equal(hit.buttonPoint.x, 160);
  });

  it('falls back to line.left + 24 when center ± 40 are both blocked', () => {
    const doc = createMockDoc();
    // Broad rect covering 140 to 260
    const broadRect: Rect = { left: 140, top: 80, width: 120, height: 40 };
    const hit = hoverInsertTarget(doc, { x: 200, y: 100 }, 10, [broadRect]);
    assert.ok(hit);
    assert.equal(hit.buttonPoint.x, 24);
  });
});
