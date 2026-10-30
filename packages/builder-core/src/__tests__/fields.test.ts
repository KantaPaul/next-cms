import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  inheritedFrom,
  isResponsive,
  resetDeviceValue,
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
