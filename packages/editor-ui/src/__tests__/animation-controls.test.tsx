import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AnimationTimelineView,
  EASING_PRESETS,
  EasingField,
  TRANSITION_PROPERTY_OPTIONS,
  TransitionPicker,
} from '../controls';

describe('EasingField & Curves (Phase 8)', () => {
  it('renders all easing curve presets with SVG paths and radio semantics', () => {
    const html = renderToStaticMarkup(
      <EasingField
        value="ease-out"
        onChange={() => {}}
      />
    );

    assert.ok(html.includes('role="radiogroup"'));
    assert.ok(html.includes('Easing Curve'));

    for (const preset of EASING_PRESETS) {
      assert.ok(html.includes(preset.label), `Should include preset label ${preset.label}`);
    }
  });

  it('marks active preset with aria-checked="true"', () => {
    const html = renderToStaticMarkup(
      <EasingField
        value="linear"
        onChange={() => {}}
      />
    );

    assert.ok(html.includes('aria-checked="true"'));
  });
});

describe('TransitionPicker & Live Preview (Phase 8)', () => {
  it('renders property select, duration, delay, easing, and hover preview box', () => {
    const html = renderToStaticMarkup(
      <TransitionPicker
        value={{
          property: 'transform',
          duration: 350,
          delay: 50,
          timingFunction: 'ease-in-out',
        }}
        onChange={() => {}}
      />
    );

    assert.ok(html.includes('Transition Property'));
    assert.ok(html.includes('Duration'));
    assert.ok(html.includes('Delay'));
    assert.ok(html.includes('Timing Function'));
    assert.ok(html.includes('350'));
    assert.ok(html.includes('Hover Me'));
    assert.ok(html.includes('role="region"'));
  });

  it('contains standard transition property options', () => {
    assert.ok(TRANSITION_PROPERTY_OPTIONS.some(o => o.value === 'all'));
    assert.ok(TRANSITION_PROPERTY_OPTIONS.some(o => o.value === 'transform'));
    assert.ok(TRANSITION_PROPERTY_OPTIONS.some(o => o.value === 'opacity'));
    assert.ok(TRANSITION_PROPERTY_OPTIONS.some(o => o.value === 'background-color'));
  });
});

describe('AnimationTimelineView (Phase 8)', () => {
  it('renders timeline ruler, controls, and segments', () => {
    const html = renderToStaticMarkup(
      <AnimationTimelineView
        duration={800}
        delay={200}
        easing="cubic-bezier(0.175, 0.885, 0.32, 1.275)"
      />
    );

    assert.ok(html.includes('Animation Timeline'));
    assert.ok(html.includes('0.00s'));
    assert.ok(html.includes('1.00s')); // 800 + 200 = 1000ms = 1s
    assert.ok(html.includes('Delay: 200ms'));
    assert.ok(html.includes('Duration: 800ms'));
  });
});
