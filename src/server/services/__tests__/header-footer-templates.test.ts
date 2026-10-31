import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localizedSettings } from '../site-settings.service';

describe('Header & Footer Templates Resolution (R484, R485)', () => {
  const baseSettings = {
    siteName: 'Acme Corp',
    siteDescription: 'Building things',
    seoTitle: 'Acme',
    seoDescription: 'Building things',
    headerTemplateId: 'site-header-id',
    footerTemplateId: 'site-footer-id',
    translations: {
      fr: {
        siteName: 'Acme FR',
        headerTemplateId: 'fr-header-id',
        footerTemplateId: 'fr-footer-id',
      },
      es: {
        siteName: 'Acme ES',
        // headerTemplateId not provided -> should fall back to site-header-id
        footerTemplateId: 'es-footer-id',
      },
    },
  };

  it('resolves site default header & footer templates for default locale', () => {
    const resolved = localizedSettings(baseSettings, 'en', 'en');
    assert.equal(resolved.headerTemplateId, 'site-header-id');
    assert.equal(resolved.footerTemplateId, 'site-footer-id');
  });

  it('resolves locale-specific template overrides when present', () => {
    const resolved = localizedSettings(baseSettings, 'fr', 'en');
    assert.equal(resolved.headerTemplateId, 'fr-header-id');
    assert.equal(resolved.footerTemplateId, 'fr-footer-id');
  });

  it('falls back to site default template when locale override is absent', () => {
    const resolved = localizedSettings(baseSettings, 'es', 'en');
    assert.equal(resolved.headerTemplateId, 'site-header-id');
    assert.equal(resolved.footerTemplateId, 'es-footer-id');
  });

  it('handles empty/null template assignments gracefully', () => {
    const emptySettings = {
      siteName: 'Empty Test',
      headerTemplateId: null,
      footerTemplateId: null,
      translations: null,
    };
    const resolved = localizedSettings(emptySettings, 'en', 'en');
    assert.equal(resolved.headerTemplateId, null);
    assert.equal(resolved.footerTemplateId, null);
  });

  it('resolves precedence hierarchy: page override > locale override > site default', () => {
    const resolveEffectiveTemplates = (
      page: { headerTemplateId?: string | null; footerTemplateId?: string | null } | null,
      localeCopy: { headerTemplateId?: string | null; footerTemplateId?: string | null },
      site: { headerTemplateId?: string | null; footerTemplateId?: string | null }
    ) => ({
      headerTemplateId:
        page?.headerTemplateId || localeCopy.headerTemplateId || site.headerTemplateId || null,
      footerTemplateId:
        page?.footerTemplateId || localeCopy.footerTemplateId || site.footerTemplateId || null,
    });

    const site = { headerTemplateId: 'site-h', footerTemplateId: 'site-f' };
    const localeCopy = { headerTemplateId: 'locale-h', footerTemplateId: 'locale-f' };

    // Case 1: Page overrides header, leaves footer empty -> page header + locale footer
    const res1 = resolveEffectiveTemplates(
      { headerTemplateId: 'page-h', footerTemplateId: null },
      localeCopy,
      site
    );
    assert.equal(res1.headerTemplateId, 'page-h');
    assert.equal(res1.footerTemplateId, 'locale-f');

    // Case 2: No page override -> locale header + locale footer
    const res2 = resolveEffectiveTemplates(null, localeCopy, site);
    assert.equal(res2.headerTemplateId, 'locale-h');
    assert.equal(res2.footerTemplateId, 'locale-f');

    // Case 3: No page override, no locale override -> site header + site footer
    const res3 = resolveEffectiveTemplates(
      null,
      { headerTemplateId: null, footerTemplateId: null },
      site
    );
    assert.equal(res3.headerTemplateId, 'site-h');
    assert.equal(res3.footerTemplateId, 'site-f');

    // Case 4: No assignment anywhere -> null (triggers fallback layout in layout.tsx)
    const res4 = resolveEffectiveTemplates(
      null,
      { headerTemplateId: null, footerTemplateId: null },
      { headerTemplateId: null, footerTemplateId: null }
    );
    assert.equal(res4.headerTemplateId, null);
    assert.equal(res4.footerTemplateId, null);
  });
});
