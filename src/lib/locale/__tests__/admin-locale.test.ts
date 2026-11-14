import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickAdminLocale } from '../admin-locale';

const locales = [{ code: 'en' }, { code: 'es' }, { code: 'ar' }];

describe('pickAdminLocale', () => {
  it('returns the matching locale code and null for unknown values', () => {
    assert.equal(pickAdminLocale('es', locales), 'es');
    assert.equal(pickAdminLocale('fr', locales), null);
    assert.equal(pickAdminLocale(undefined, locales), null);
    assert.equal(pickAdminLocale('', locales), null);
  });
});
