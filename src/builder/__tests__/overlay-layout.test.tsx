import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  OverlayBackdropField,
  OverlayBackgroundField,
  OverlayHeightField,
  OverlayPaddingField,
  OverlayRadiusField,
  OverlayWidthField,
} from '../controls/overlay-layout';

const render = (
  component: (props: never) => unknown,
  label: string,
  value: unknown
) =>
  renderToStaticMarkup(
    createElement(component as never, {
      value,
      onChange: () => {},
      field: { label, overlayCategory: 'Popup' },
    } as never)
  );

describe('Popup and Drawer layout controls', () => {
  it('show older saved values in the new controls', () => {
    assert.match(render(OverlayWidthField, 'Width', '520px'), /520/);
    assert.match(render(OverlayHeightField, 'Max height', '75vh'), /75/);
    assert.match(render(OverlayRadiusField, 'Corner radius', 'lg'), /16/);
    assert.match(render(OverlayPaddingField, 'Padding', 'sm'), /16/);
    assert.match(
      render(OverlayBackdropField, 'Backdrop color', 'rgba(0, 0, 0, 0.4)'),
      /40/
    );
  });

  it('show saved values and fall back to defaults when empty', () => {
    assert.match(
      render(OverlayWidthField, 'Width', {
        value: { desktop: 640 },
        unit: 'px',
      }),
      /640/
    );
    assert.match(render(OverlayWidthField, 'Width', undefined), /480/);
    assert.match(
      render(OverlayBackgroundField, 'Background color', undefined),
      /ffffff/i
    );
  });
});
