import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChooseField,
  ControlRow,
  FloatingLabelInput,
  NumberField,
  RollingStepper,
  SelectField,
  SliderField,
  TokenChip,
  UnitSelect,
  WakeSlider,
  clamp,
  controlMessageId,
  decayWake,
  filledBarCount,
  roundTo,
  scrubMultiplier,
  scrubValue,
  tickPercent,
  wakeAmount,
} from '../controls';
import { FieldRow } from '../inspector/FieldRow';

describe('Controls math helpers (E12b–c)', () => {
  it('clamp restricts values to the [min, max] range', () => {
    assert.strictEqual(clamp(5, 0, 10), 5);
    assert.strictEqual(clamp(-5, 0, 10), 0);
    assert.strictEqual(clamp(15, 0, 10), 10);
    // Handles swapped min and max
    assert.strictEqual(clamp(15, 10, 0), 10);
    // Handles non-finite
    assert.strictEqual(clamp(Number.NaN, 0, 10), 0);
  });

  it('roundTo cleans up floating point inaccuracy', () => {
    assert.strictEqual(roundTo(0.1 + 0.2, 2), 0.3);
    assert.strictEqual(roundTo(1.23456, 2), 1.23);
    assert.strictEqual(roundTo(1.23456, 0), 1);
  });

  it('scrubMultiplier scales according to modifier keys', () => {
    assert.strictEqual(scrubMultiplier(), 1);
    assert.strictEqual(scrubMultiplier({ shiftKey: true }), 10);
    assert.strictEqual(scrubMultiplier({ altKey: true }), 0.1);
  });

  it('scrubValue updates numbers based on dragged pixels and step size', () => {
    // 20 px dragged, step 1 -> +10 steps
    assert.strictEqual(scrubValue(10, 20, 1), 20);
    // 20 px dragged with shift -> 10x faster (+100)
    assert.strictEqual(scrubValue(10, 20, 1, { shiftKey: true }), 110);
    // 20 px dragged with alt -> 10x slower (+1)
    assert.strictEqual(scrubValue(10, 20, 1, { altKey: true }), 11);
  });

  it('tickPercent places values along min..max as 0-100%', () => {
    assert.strictEqual(tickPercent(0, 0, 100), 0);
    assert.strictEqual(tickPercent(50, 0, 100), 50);
    assert.strictEqual(tickPercent(100, 0, 100), 100);
    assert.strictEqual(tickPercent(25, 0, 50), 50);
    // Out of bounds clamped
    assert.strictEqual(tickPercent(-10, 0, 100), 0);
    assert.strictEqual(tickPercent(150, 0, 100), 100);
    // Equal min and max returns 0
    assert.strictEqual(tickPercent(10, 10, 10), 0);
  });
});

describe('TokenChip (E12b–c)', () => {
  it('renders token name and sparkles icon', () => {
    const html = renderToStaticMarkup(<TokenChip tokenName="spacing-md" />);
    assert.match(html, /spacing-md/);
    assert.match(html, /title="Linked to token spacing-md"/);
    assert.match(html, /lucide-sparkles/);
  });

  it('renders clear button when onClear is supplied', () => {
    const html = renderToStaticMarkup(
      <TokenChip tokenName="primary" onClear={() => {}} />
    );
    assert.match(html, /aria-label="Clear token primary"/);
    assert.match(html, /lucide-x/);
  });
});

describe('UnitSelect (E12b–c)', () => {
  it('renders a select trigger with current unit', () => {
    const html = renderToStaticMarkup(
      <UnitSelect value="rem" onChange={() => {}} />
    );
    assert.match(html, /role="combobox"/);
    assert.match(html, /aria-label="Unit"/);
    assert.match(html, /rem/);
  });

  it('supports compact variant for input integration', () => {
    const html = renderToStaticMarkup(
      <UnitSelect value="px" variant="compact" onChange={() => {}} />
    );
    assert.match(html, /border-none/);
    assert.match(html, /px/);
  });
});

describe('ControlRow (E12b–c)', () => {
  it('links label to control id and shows helper/error text', () => {
    const id = 'my-control';
    const msgId = controlMessageId(id, { helperText: 'Hint' });
    assert.strictEqual(msgId, 'my-control-message');

    const html = renderToStaticMarkup(
      <ControlRow
        label="Padding"
        htmlFor={id}
        helperText="In pixels"
        info="Outer spacing"
        tokenName="space-4"
        changed
        onReset={() => {}}
      >
        <input id={id} />
      </ControlRow>
    );

    assert.match(html, /<label[^>]*for="my-control"/);
    assert.match(html, /Padding/);
    assert.match(html, /In pixels/);
    assert.match(html, /id="my-control-message"/);
    assert.match(html, /aria-label="Outer spacing"/);
    assert.match(html, /space-4/);
    assert.match(html, /aria-label="Reset Padding"/);
  });

  it('renders error alert message when errorText is provided', () => {
    const html = renderToStaticMarkup(
      <ControlRow label="Margin" htmlFor="margin-field" errorText="Value too high">
        <input id="margin-field" />
      </ControlRow>
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /Value too high/);
  });

  it('makes label a scrub handle when onLabelPointerDown is provided', () => {
    const html = renderToStaticMarkup(
      <ControlRow
        label="Width"
        htmlFor="w"
        onLabelPointerDown={() => {}}
      >
        <input id="w" />
      </ControlRow>
    );
    assert.match(html, /cursor-ew-resize/);
    assert.match(html, /Drag to change Width/);
  });
});

describe('NumberField (E12b–c)', () => {
  it('renders numeric input and label scrub handle', () => {
    const html = renderToStaticMarkup(
      <NumberField
        label="Font Size"
        value={16}
        onChange={() => {}}
        unit="px"
      />
    );
    assert.match(html, /value="16"/);
    assert.match(html, /px/);
    assert.match(html, /Font Size/);
    assert.match(html, /cursor-ew-resize/);
  });

  it('renders unit chips as a radio group when units list is provided', () => {
    const html = renderToStaticMarkup(
      <NumberField
        label="Size"
        value={24}
        onChange={() => {}}
        unit="rem"
        units={['px', 'rem', '%']}
        onUnitChange={() => {}}
      />
    );
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-label="Size unit"/);
    // rem should be checked
    assert.match(html, /role="radio"[^>]*aria-checked="true"[^>]*>rem<\/button>/);
    // px should not be checked
    assert.match(html, /role="radio"[^>]*aria-checked="false"[^>]*>px<\/button>/);
  });
});

describe('SliderField (E12b–c)', () => {
  it('renders range slider, double click reset, and companion NumberInput', () => {
    const html = renderToStaticMarkup(
      <SliderField
        label="Opacity"
        value={75}
        onChange={() => {}}
        min={0}
        max={100}
        step={5}
        unit="%"
        defaultValue={100}
      />
    );
    assert.match(html, /type="range"/);
    assert.match(html, /value="75"/);
    assert.match(html, /min="0"/);
    assert.match(html, /max="100"/);
    assert.match(html, /title="Double-click to reset"/);
    // Companion NumberInput
    assert.match(html, /type="number"/);
  });

  it('renders percent-placed ticks along the track', () => {
    const html = renderToStaticMarkup(
      <SliderField
        label="Track"
        value={50}
        onChange={() => {}}
        min={0}
        max={100}
        ticks={[0, 25, 50, 75, 100]}
      />
    );
    assert.match(html, /inset-inline-start:\s*0%/);
    assert.match(html, /inset-inline-start:\s*25%/);
    assert.match(html, /inset-inline-start:\s*50%/);
    assert.match(html, /inset-inline-start:\s*75%/);
    assert.match(html, /inset-inline-start:\s*100%/);
  });
});

describe('ChooseField (E12b–c)', () => {
  it('renders a radiogroup with segmented buttons and roving tabIndex', () => {
    const html = renderToStaticMarkup(
      <ChooseField
        label="Alignment"
        value="center"
        onChange={() => {}}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ]}
      />
    );
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-label="Alignment"/);
    // Center selected
    assert.match(
      html,
      /role="radio"[^>]*aria-checked="true"[^>]*tabindex="0"[^>]*><span class="truncate">Center<\/span><\/button>/
    );
    // Left unselected
    assert.match(
      html,
      /role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*><span class="truncate">Left<\/span><\/button>/
    );
  });

  it('supports icons and custom titles', () => {
    const html = renderToStaticMarkup(
      <ChooseField
        value="grid"
        onChange={() => {}}
        options={[
          { value: 'flex', title: 'Flexbox layout' },
          { value: 'grid', title: 'Grid layout' },
        ]}
      />
    );
    assert.match(html, /title="Grid layout"/);
    assert.match(html, /aria-label="Grid layout"/);
  });
});

describe('SelectField (E12b–c)', () => {
  it('renders Radix Select inside ControlRow with options', () => {
    const html = renderToStaticMarkup(
      <SelectField
        label="Font Family"
        value="inter"
        onChange={() => {}}
        options={[
          { value: 'inter', label: 'Inter' },
          { value: 'roboto', label: 'Roboto' },
        ]}
      />
    );
    assert.match(html, /Font Family/);
    assert.match(html, /role="combobox"/);
    assert.match(html, /Inter/);
  });
});


describe('Wake slider math (variant helpers)', () => {
  it('computes wake amount from movement velocity and clamps', () => {
    assert.strictEqual(wakeAmount(0, 100, 100), 0);
    assert.ok(wakeAmount(50, 50, 100) > 0);
    assert.ok(wakeAmount(5000, 10, 100) <= 1);
  });

  it('decays wake toward zero over time', () => {
    const a = decayWake(1, 180);
    assert.ok(a > 0 && a < 1);
    assert.strictEqual(decayWake(0.005, 500), 0);
  });

  it('fills bars by value percent', () => {
    assert.strictEqual(filledBarCount(0, 0, 100, 10), 0);
    assert.strictEqual(filledBarCount(100, 0, 100, 10), 10);
    assert.strictEqual(filledBarCount(50, 0, 100, 10), 5);
  });
});

describe('FloatingLabelInput (variant)', () => {
  it('keeps label resting when empty and lifts when filled', () => {
    const empty = renderToStaticMarkup(
      <FloatingLabelInput id="f1" label="Title" value="" onChange={() => {}} />
    );
    assert.match(empty, /for="f1"/);
    assert.match(empty, />Title</);
    assert.match(empty, /translate-y/);

    const filled = renderToStaticMarkup(
      <FloatingLabelInput id="f2" label="Title" value="Hello" onChange={() => {}} />
    );
    assert.match(filled, /value="Hello"/);
    assert.match(filled, /-top-2/);
  });
});

describe('RollingStepper (variant)', () => {
  it('shows dash for unset value and disables min/max buttons at limits', () => {
    const unset = renderToStaticMarkup(
      <RollingStepper label="Thickness" value={undefined} min={0} onChange={() => {}} />
    );
    assert.match(unset, /—/);

    const atMin = renderToStaticMarkup(
      <RollingStepper label="Thickness" value={0} min={0} onChange={() => {}} />
    );
    assert.match(atMin, /Decrease Thickness"[^>]*disabled/);

    const atMax = renderToStaticMarkup(
      <RollingStepper label="Thickness" value={10} max={10} onChange={() => {}} />
    );
    assert.match(atMax, /Increase Thickness"[^>]*disabled/);
  });

  it('draws no inner label when placed in a labeled row', () => {
    // In a FieldRow the row owns the label; the stepper renders bare.
    const bare = renderToStaticMarkup(
      <RollingStepper value={4} onChange={() => {}} />
    );
    assert.doesNotMatch(bare, /<label/);
    assert.doesNotMatch(bare, /ControlRow/);
  });
});

describe('FieldRow hideLabel', () => {
  it('omits the standard label when hideLabel is set', () => {
    const html = renderToStaticMarkup(
      <FieldRow label="Title" hideLabel>
        <input id="x" />
      </FieldRow>
    );
    assert.doesNotMatch(html, /<label/);
    assert.match(html, /<input/);
  });
});

describe('WakeSlider (variant)', () => {
  it('renders bar track and range input with value', () => {
    const html = renderToStaticMarkup(
      <WakeSlider label="Videos per page" value={12} min={1} max={48} onChange={() => {}} />
    );
    assert.match(html, /type="range"/);
    assert.match(html, /value="12"/);
  });

  it('draws no inner label when placed in a labeled row', () => {
    const bare = renderToStaticMarkup(
      <WakeSlider value={12} min={1} max={48} onChange={() => {}} />
    );
    assert.doesNotMatch(bare, /<label/);
    assert.match(bare, /type="range"/);
  });
});
