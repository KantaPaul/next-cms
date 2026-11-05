/**
 * Dashboard working language: cookie validation and list links.
 * Run with: npx tsx --test src/lib/locale/__tests__/admin-locale.test.ts
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { pickAdminLocale, withAdminLanguage } from '../admin-locale';

const locales = [{ code: 'en' }, { code: 'es' }];

describe('pickAdminLocale', () => {
  it('accepts only the site’s locales', () => {
    assert.equal(pickAdminLocale('es', locales), 'es');
    assert.equal(pickAdminLocale('fr', locales), null);
    assert.equal(pickAdminLocale(undefined, locales), null);
    assert.equal(pickAdminLocale('', locales), null);
  });
});

describe('withAdminLanguage', () => {
  it('adds ?language= to lists that filter by it', () => {
    assert.equal(withAdminLanguage('/dashboard/posts', 'es'), '/dashboard/posts?language=es');
    assert.equal(
      withAdminLanguage('/dashboard/pages?status=draft', 'es'),
      '/dashboard/pages?status=draft&language=es'
    );
  });

  it('leaves other routes, and no chosen language, alone', () => {
    assert.equal(withAdminLanguage('/dashboard/media', 'es'), '/dashboard/media');
    assert.equal(withAdminLanguage('/dashboard/posts', null), '/dashboard/posts');
  });
});
