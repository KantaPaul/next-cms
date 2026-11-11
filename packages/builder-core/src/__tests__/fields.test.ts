import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  type BreakpointConfig,
  canvasWidthsFromConfig,
  DEFAULT_BREAKPOINTS,
  deviceForWidth,
  enabledDevices,
  fallbackFor,
  inheritedFrom,
  isResponsive,
  normalizeBreakpointConfig,
  resetDeviceValue,
  validateBreakpoints,
  valueForDevice,
  withDeviceValue,
} from '../fields';

describe('isResponsive', () => {
  it('recognizes an object keyed only by device names', () => {
    assert.equal(isResponsive({ desktop: 1, mobile: 2 }), true);
  });

  it('rejects plain values, empty objects, arrays, and unknown keys', () => {
    assert.equal(isResponsive(1), false);
    assert.equal(isResponsive('x'), false);
    assert.equal(isResponsive(undefined), false);
    assert.equal(isResponsive({}), false);
    assert.equal(isResponsive([1, 2]), false);
    assert.equal(isResponsive({ desktop: 1, color: 'red' }), false);
  });
});

describe('valueForDevice (responsive inheritance, R694)', () => {
  it('returns a plain value for every device', () => {
    assert.equal(valueForDevice(5, 'desktop'), 5);
    assert.equal(valueForDevice(5, 'mobile'), 5);
  });

  it('returns the device value when set', () => {
    assert.equal(valueForDevice({ desktop: 1, mobile: 2 }, 'mobile'), 2);
  });

  it('falls back toward desktop when a device has no value of its own', () => {
    assert.equal(valueForDevice({ desktop: 1 }, 'tablet'), 1);
    assert.equal(valueForDevice({ desktop: 1 }, 'mobile'), 1);
  });

  it('tablet falls back through desktop before mobile, and mobile through tablet before desktop', () => {
    assert.equal(valueForDevice({ desktop: 1, mobile: 3 }, 'tablet'), 1);
    assert.equal(valueForDevice({ tablet: 2, desktop: 1 }, 'mobile'), 2);
  });

  it('returns undefined when nothing is set anywhere', () => {
    assert.equal(valueForDevice(undefined, 'desktop'), undefined);
    assert.equal(valueForDevice({ mobile: undefined }, 'mobile'), undefined);
  });
});

describe('inheritedFrom', () => {
  it('is null for an unset value, and desktop for a plain one', () => {
    assert.equal(inheritedFrom(undefined, 'mobile'), null);
    assert.equal(inheritedFrom(5, 'mobile'), 'desktop');
  });

  it('names the device a shown value actually came from', () => {
    assert.equal(inheritedFrom({ desktop: 1, mobile: 2 }, 'mobile'), 'mobile');
    assert.equal(inheritedFrom({ desktop: 1 }, 'mobile'), 'desktop');
  });

  it('is null when the responsive value has nothing in the fallback chain', () => {
    assert.equal(inheritedFrom({ tablet: 1 }, 'mobile'), 'tablet');
    assert.equal(inheritedFrom({ mobile: undefined }, 'mobile'), null);
  });
});

describe('withDeviceValue', () => {
  it('turns a plain value into desktop, then sets the target device', () => {
    assert.deepEqual(withDeviceValue(5, 'mobile', 9), {
      desktop: 5,
      mobile: 9,
    });
  });

  it('starts from an empty object when there was no value', () => {
    assert.deepEqual(withDeviceValue(undefined, 'desktop', 1), { desktop: 1 });
  });

  it('overwrites just the target device of an existing responsive value', () => {
    assert.deepEqual(withDeviceValue({ desktop: 1, mobile: 2 }, 'mobile', 9), {
      desktop: 1,
      mobile: 9,
    });
  });
});

describe('resetDeviceValue', () => {
  it('clears a plain value only when resetting desktop', () => {
    assert.equal(resetDeviceValue(5, 'desktop'), undefined);
    assert.equal(resetDeviceValue(5, 'mobile'), 5);
  });

  it('removes just the one device from a responsive value', () => {
    assert.deepEqual(resetDeviceValue({ desktop: 1, mobile: 2 }, 'mobile'), {
      desktop: 1,
    });
  });

  it('returns undefined once the last device is cleared', () => {
    assert.equal(resetDeviceValue({ mobile: 2 }, 'mobile'), undefined);
  });
});

function configWith(enabled: string[], widths: Record<string, number> = {}): BreakpointConfig {
  return DEFAULT_BREAKPOINTS.map(entry => ({
    ...entry,
    width: widths[entry.device] ?? entry.width,
    enabled: entry.device === 'desktop' ? true : enabled.includes(entry.device),
  }));
}

describe('custom breakpoints model', () => {
  it('supports old and new responsive keys in isResponsive and valueForDevice', () => {
    assert.equal(isResponsive({ desktop: 1, tablet: 2, mobile: 3 }), true);
    assert.equal(isResponsive({ laptop: 12, mobile_extra: 8, widescreen: 20 }), true);

    const cfg = configWith(['widescreen', 'laptop', 'tablet_extra', 'tablet', 'mobile_extra', 'mobile']);
    assert.equal(valueForDevice({ desktop: 10, laptop: 8 }, 'laptop', cfg), 8);
    assert.equal(valueForDevice({ desktop: 10, laptop: 8 }, 'tablet_extra', cfg), 8);
    assert.equal(valueForDevice({ desktop: 10, laptop: 8 }, 'mobile', cfg), 8);
    assert.equal(valueForDevice({ desktop: 10, widescreen: 14 }, 'widescreen', cfg), 14);
    assert.equal(valueForDevice({ desktop: 10 }, 'widescreen', cfg), 10);
  });

  it('skips disabled devices in fallbackFor while preserving saved values', () => {
    const val = { desktop: 20, laptop: 16, tablet_extra: 15, tablet: 14, mobile_extra: 13, mobile: 12 };

    // Only desktop, tablet, mobile enabled (default)
    assert.deepEqual(fallbackFor('mobile', DEFAULT_BREAKPOINTS), ['mobile', 'tablet', 'desktop']);
    assert.deepEqual(fallbackFor('laptop', DEFAULT_BREAKPOINTS), ['desktop']);
    assert.equal(valueForDevice(val, 'laptop', DEFAULT_BREAKPOINTS), 20);
    assert.equal(inheritedFrom(val, 'laptop', DEFAULT_BREAKPOINTS), 'desktop');

    // Every subset of the 4 optional breakpoints produces valid chains ending at desktop
    const optional = ['widescreen', 'laptop', 'tablet_extra', 'mobile_extra'] as const;
    for (let mask = 0; mask < 16; mask++) {
      const on = ['tablet', 'mobile', ...optional.filter((_, i) => (mask & (1 << i)) !== 0)];
      const cfg = configWith(on);
      assert.deepEqual(fallbackFor('desktop', cfg), ['desktop']);
      assert.deepEqual(
        fallbackFor('widescreen', cfg),
        on.includes('widescreen') ? ['widescreen', 'desktop'] : ['desktop']
      );
      for (const d of ['laptop', 'tablet_extra', 'tablet', 'mobile_extra', 'mobile'] as const) {
        const chain = fallbackFor(d, cfg);
        assert.equal(chain[chain.length - 1], 'desktop');
        if (on.includes(d)) {
          assert.equal(chain[0], d);
        } else {
          assert.ok(!chain.includes(d));
        }
      }
    }
  });

  it('maps widths to devices at exact breakpoint edges', () => {
    assert.equal(deviceForWidth(375, DEFAULT_BREAKPOINTS), 'mobile');
    assert.equal(deviceForWidth(767, DEFAULT_BREAKPOINTS), 'mobile');
    assert.equal(deviceForWidth(768, DEFAULT_BREAKPOINTS), 'tablet');
    assert.equal(deviceForWidth(1023, DEFAULT_BREAKPOINTS), 'tablet');
    assert.equal(deviceForWidth(1024, DEFAULT_BREAKPOINTS), 'desktop');
    assert.equal(deviceForWidth(2400, DEFAULT_BREAKPOINTS), 'desktop');

    const allOn = configWith(['widescreen', 'laptop', 'tablet_extra', 'tablet', 'mobile_extra', 'mobile']);
    assert.equal(deviceForWidth(2400, allOn), 'widescreen');
    assert.equal(deviceForWidth(2399, allOn), 'desktop');
    assert.equal(deviceForWidth(1367, allOn), 'desktop');
    assert.equal(deviceForWidth(1366, allOn), 'laptop');
    assert.equal(deviceForWidth(1201, allOn), 'laptop');
    assert.equal(deviceForWidth(1200, allOn), 'tablet_extra');
    assert.equal(deviceForWidth(1024, allOn), 'tablet_extra');
    assert.equal(deviceForWidth(1023, allOn), 'tablet');
    assert.equal(deviceForWidth(881, allOn), 'tablet');
    assert.equal(deviceForWidth(880, allOn), 'mobile_extra');
    assert.equal(deviceForWidth(768, allOn), 'mobile_extra');
    assert.equal(deviceForWidth(767, allOn), 'mobile');

    const customTablet = configWith(['tablet', 'mobile'], { tablet: 900 });
    assert.equal(deviceForWidth(900, customTablet), 'tablet');
    assert.equal(deviceForWidth(901, customTablet), 'desktop');
  });

  it('validates breakpoint width ordering and duplicates', () => {
    assert.deepEqual(validateBreakpoints(DEFAULT_BREAKPOINTS), { ok: true });
    const dup = configWith(['tablet', 'mobile'], { tablet: 1200 }); // duplicates tablet_extra=1200
    assert.equal(validateBreakpoints(dup).ok, false);
    const inverted = configWith(['tablet', 'mobile'], { mobile: 1100 });
    assert.equal(validateBreakpoints(inverted).ok, false);
  });

  it('normalizes partial configs and computes canvas preview widths', () => {
    const normalized = normalizeBreakpointConfig([{ device: 'laptop', enabled: true }]);
    assert.equal(normalized.length, 7);
    assert.deepEqual(enabledDevices(normalized), ['desktop', 'laptop', 'tablet', 'mobile']);
    const widths = canvasWidthsFromConfig(normalized);
    assert.equal(widths.laptop, 1366);
    assert.equal(widths.desktop, 1400);
    assert.equal(widths.tablet, 768);
    assert.equal(widths.mobile, 375);
  });
});
