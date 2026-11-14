import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adminHref,
  dashboardLocale,
  stripAdminLocale,
  swapAdminLocale,
} from '../admin-href';

describe('adminHref', () => {
  it('omits prefix for the default locale', () => {
    assert.equal(adminHref('/dashboard', 'en', 'en'), '/dashboard');
    assert.equal(adminHref('/dashboard/pages', 'en', 'en'), '/dashboard/pages');
    assert.equal(
      adminHref('/dashboard/pages/create?type=landing', 'en', 'en'),
      '/dashboard/pages/create?type=landing'
    );
  });

  it('prefixes non-default locales after /dashboard', () => {
    assert.equal(adminHref('/dashboard', 'es', 'en'), '/dashboard/es');
    assert.equal(
      adminHref('/dashboard/pages/create', 'es', 'en'),
      '/dashboard/es/pages/create'
    );
    assert.equal(
      adminHref('/dashboard/collections/docs/123?tab=seo#top', 'ar', 'en'),
      '/dashboard/ar/collections/docs/123?tab=seo#top'
    );
  });

  it('is idempotent when called with an already-prefixed path', () => {
    assert.equal(
      adminHref('/dashboard/es/pages', 'fr', 'en'),
      '/dashboard/fr/pages'
    );
    assert.equal(
      adminHref('/dashboard/es/pages', 'en', 'en'),
      '/dashboard/pages'
    );
  });

  it('leaves non-dashboard paths unchanged', () => {
    assert.equal(adminHref('/main/about', 'es', 'en'), '/main/about');
    assert.equal(adminHref('/login', 'es', 'en'), '/login');
  });
});

describe('stripAdminLocale & dashboardLocale', () => {
  it('extracts locale and strips prefix', () => {
    assert.deepEqual(stripAdminLocale('/dashboard/es/pages'), {
      locale: 'es',
      path: '/dashboard/pages',
    });
    assert.deepEqual(stripAdminLocale('/dashboard/pt-BR/posts/1/edit?a=1'), {
      locale: 'pt-BR',
      path: '/dashboard/posts/1/edit?a=1',
    });
    assert.deepEqual(stripAdminLocale('/dashboard/es'), {
      locale: 'es',
      path: '/dashboard',
    });
  });

  it('does not treat reserved dashboard routes as locales', () => {
    assert.deepEqual(dashboardLocale('/dashboard/api/health'), {
      locale: null,
      rewritePath: null,
    });
    assert.deepEqual(dashboardLocale('/dashboard/seo'), {
      locale: null,
      rewritePath: null,
    });
    assert.deepEqual(dashboardLocale('/dashboard/dev/editor-ui'), {
      locale: null,
      rewritePath: null,
    });
    assert.deepEqual(dashboardLocale('/dashboard/pages'), {
      locale: null,
      rewritePath: null,
    });
  });

  it('round-trips through swapAdminLocale', () => {
    const start = '/dashboard/es/pages?status=draft';
    const toAr = swapAdminLocale(start, 'ar', 'en');
    assert.equal(toAr, '/dashboard/ar/pages?status=draft');
    const toEn = swapAdminLocale(toAr, 'en', 'en');
    assert.equal(toEn, '/dashboard/pages?status=draft');
  });
});
