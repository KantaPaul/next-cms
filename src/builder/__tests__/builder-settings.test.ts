import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_BUILDER_SETTINGS, normalizeBuilderSettings } from '@/config/builder-settings';
import { builderSettingsSchema } from '@/app/(admin)/dashboard/(shell)/settings/_modules/settings.schemas';

describe('builder settings (style classes flag)', () => {
  it('is off by default and for anything that is not exactly true', () => {
    assert.deepEqual(DEFAULT_BUILDER_SETTINGS, { styleClasses: false });
    for (const value of [undefined, null, {}, { styleClasses: 'true' }, { styleClasses: 1 }, 'on', []]) {
      assert.deepEqual(normalizeBuilderSettings(value), { styleClasses: false });
    }
  });

  it('keeps an explicit true and drops unknown keys', () => {
    assert.deepEqual(normalizeBuilderSettings({ styleClasses: true, other: 1 }), { styleClasses: true });
  });

  it('accepts only a boolean from the settings form', () => {
    assert.ok(builderSettingsSchema.safeParse({ styleClasses: true }).success);
    assert.ok(!builderSettingsSchema.safeParse({ styleClasses: 'yes' }).success);
    assert.ok(!builderSettingsSchema.safeParse({}).success);
  });
});
