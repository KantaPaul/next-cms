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

  it('resolves precedence hierarchy for posts: post override > locale override > site default', () => {
    const resolveEffectiveTemplates = (
      post: { headerTemplateId?: string | null; footerTemplateId?: string | null } | null,
      localeCopy: { headerTemplateId?: string | null; footerTemplateId?: string | null },
      site: { headerTemplateId?: string | null; footerTemplateId?: string | null }
    ) => ({
      headerTemplateId:
        post?.headerTemplateId || localeCopy.headerTemplateId || site.headerTemplateId || null,
      footerTemplateId:
        post?.footerTemplateId || localeCopy.footerTemplateId || site.footerTemplateId || null,
    });

    const site = { headerTemplateId: 'site-h', footerTemplateId: 'site-f' };
    const localeCopy = { headerTemplateId: 'locale-h', footerTemplateId: 'locale-f' };

    const res = resolveEffectiveTemplates(
      { headerTemplateId: 'post-h', footerTemplateId: 'post-f' },
      localeCopy,
      site
    );
    assert.equal(res.headerTemplateId, 'post-h');
    assert.equal(res.footerTemplateId, 'post-f');
  });

  it('resolveTemplate respects explicit hide sentinel and boolean flags', () => {
    const { resolveTemplate } = require('../template-resolver.service');

    // Case 1: 'none' sentinel suppresses template and prevents fallback
    const hideHeader = resolveTemplate({
      area: 'header',
      entity: { headerTemplateId: 'none' },
      localeOverride: 'locale-h',
      siteDefault: 'site-h',
    });
    assert.equal(hideHeader.templateId, null);
    assert.equal(hideHeader.isHidden, true);
    assert.equal(hideHeader.source, 'explicit-hide');

    // Case 2: boolean hideFooter suppresses template
    const hideFooter = resolveTemplate({
      area: 'footer',
      entity: { hideFooter: true },
      localeOverride: 'locale-f',
      siteDefault: 'site-f',
    });
    assert.equal(hideFooter.templateId, null);
    assert.equal(hideFooter.isHidden, true);
    assert.equal(hideFooter.source, 'explicit-hide');
  });

  it('resolveTemplate prioritizes display rules before locale and site defaults', () => {
    const { resolveTemplate } = require('../template-resolver.service');

    const rules = [
      {
        id: 'rule-blog',
        templateId: 'blog-header',
        area: 'header',
        kind: 'post-type',
        value: 'post',
        priority: 1,
      },
      {
        id: 'rule-case-study',
        templateId: 'case-study-header',
        area: 'header',
        kind: 'category',
        value: 'cat-case-studies',
        priority: 10,
      },
      {
        id: 'rule-special-tag',
        templateId: 'tag-header',
        area: 'header',
        kind: 'tag',
        value: 'tag-featured',
        priority: 10,
      },
    ];

    // Case 1: Post matches post-type rule
    const resPost = resolveTemplate({
      area: 'header',
      entity: { type: 'post' },
      rules,
      localeOverride: 'locale-h',
      siteDefault: 'site-h',
    });
    assert.equal(resPost.templateId, 'blog-header');
    assert.equal(resPost.source, 'rule');

    // Case 2: Post matches higher priority category rule over post-type
    const resCat = resolveTemplate({
      area: 'header',
      entity: { type: 'post', categoryIds: ['cat-case-studies'] },
      rules,
      localeOverride: 'locale-h',
      siteDefault: 'site-h',
    });
    assert.equal(resCat.templateId, 'case-study-header');
    assert.equal(resCat.source, 'rule');

    // Case 3: Tag has higher specificity than category when priorities are equal
    const resTag = resolveTemplate({
      area: 'header',
      entity: {
        type: 'post',
        categoryIds: ['cat-case-studies'],
        tagIds: ['tag-featured'],
      },
      rules,
      localeOverride: 'locale-h',
      siteDefault: 'site-h',
    });
    assert.equal(resTag.templateId, 'tag-header');
    assert.equal(resTag.source, 'rule');

    // Case 4: Explicit page override wins over all rules
    const resOverride = resolveTemplate({
      area: 'header',
      entity: {
        headerTemplateId: 'custom-h',
        type: 'post',
        tagIds: ['tag-featured'],
      },
      rules,
      localeOverride: 'locale-h',
      siteDefault: 'site-h',
    });
    assert.equal(resOverride.templateId, 'custom-h');
    assert.equal(resOverride.source, 'entity-override');
  });
});
