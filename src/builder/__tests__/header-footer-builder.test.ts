import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProps, validateProps } from '@nextcms/builder-core';
import { editorSetup, pageDefinitions } from '../definitions';
import { normalizeGlobalContent } from '../normalize-global-content';
import { resolveChromeStyle } from '../style';
import { menuHref } from '@/components/site/menu-links';
import {
  HEADER_STARTERS,
  FOOTER_STARTERS,
  SEARCH_STARTERS,
  ARCHIVE_STARTERS,
  getStarterContent,
} from '@/db/seed/header-footer-starters';

describe('Header & Footer builder palette and editor setup', () => {
  it('editorSetup(header) surfaces only header and footer palette groups, with Header first', () => {
    const setup = editorSetup('header');
    assert.equal(setup.groups.length, 2);
    assert.equal(setup.groups[0].title, 'Header');
    assert.equal(setup.groups[1].title, 'Footer');
    assert.ok(setup.groups[0].types.includes('HeaderBar'));
    assert.ok(setup.groups[0].types.includes('HeaderColumns'));
    assert.ok(setup.groups[0].types.includes('Logo'));
    assert.ok(setup.groups[0].types.includes('NavMenu'));
    assert.ok(setup.groups[0].types.includes('MobileMenu'));
    assert.ok(setup.groups[0].types.includes('SearchBox'));
    assert.ok(setup.groups[0].types.includes('AnnouncementBar'));
    assert.ok(setup.groups[0].types.includes('SocialIcons'));
    assert.ok(setup.groups[0].types.includes('ContactInfo'));
    assert.ok(setup.groups[0].types.includes('ThemeToggle'));
    assert.ok(setup.groups[0].types.includes('LanguageSwitcher'));
    assert.ok(setup.groups[1].types.includes('FooterColumns'));
    assert.ok(setup.groups[1].types.includes('Copyright'));
    assert.ok(setup.groups[1].types.includes('FooterLinks'));
    assert.ok(setup.groups[1].types.includes('LegalLinks'));
    assert.ok(setup.groups[1].types.includes('BackToTop'));
    assert.ok(setup.groups[1].types.includes('SocialIcons'));
    assert.ok(setup.groups[1].types.includes('ContactInfo'));
    assert.ok(setup.groups[1].types.includes('ThemeToggle'));
    // Page blocks like Hero or Features must NOT be in palette groups
    assert.ok(!setup.groups[0].types.includes('Hero'));
    assert.ok(!setup.groups[1].types.includes('Features'));

    // Inspector still has definitions for container so legacy headers load
    assert.ok(setup.definitions.Container);
    assert.ok(!setup.definitions.GlobalRef); // no nesting global blocks

    // Root fields
    assert.ok(setup.rootFields.style);
    assert.equal(setup.rootFields.style.group, 'Style & layout');
    assert.ok(setup.rootFields.sticky);
    assert.ok(setup.rootFields.transparent);
    assert.ok(setup.rootFields.shrinkOnScroll);
  });

  it('editorSetup(footer) surfaces only footer and header palette groups, with Footer first', () => {
    const setup = editorSetup('footer');
    assert.equal(setup.groups.length, 2);
    assert.equal(setup.groups[0].title, 'Footer');
    assert.equal(setup.groups[1].title, 'Header');

    // Root fields
    assert.ok(setup.rootFields.style);
    assert.equal(setup.rootFields.style.group, 'Style & layout');
  });

  it('editorSetup(page) and editorSetup(global) palettes exclude header and footer blocks', () => {
    const pageSetup = editorSetup('page');
    const globalSetup = editorSetup('global');

    for (const group of pageSetup.groups) {
      assert.notEqual(group.title, 'Header');
      assert.notEqual(group.title, 'Footer');
      assert.ok(!group.types.includes('HeaderBar'));
      assert.ok(!group.types.includes('FooterColumns'));
      assert.ok(!group.types.includes('LegalLinks'));
      assert.ok(!group.types.includes('BackToTop'));
    }

    for (const group of globalSetup.groups) {
      assert.notEqual(group.title, 'Header');
      assert.notEqual(group.title, 'Footer');
      assert.ok(!group.types.includes('HeaderBar'));
      assert.ok(!group.types.includes('FooterColumns'));
      assert.ok(!group.types.includes('LegalLinks'));
      assert.ok(!group.types.includes('BackToTop'));
    }
  });
});

describe('Header & Footer block definitions and schemas', () => {
  const chromeTypes = [
    'HeaderBar',
    'HeaderColumns',
    'FooterColumns',
    'Logo',
    'NavMenu',
    'Copyright',
    'FooterLinks',
    'MobileMenu',
    'SearchBox',
    'AnnouncementBar',
    'SocialIcons',
    'ContactInfo',
    'LegalLinks',
    'BackToTop',
    'ThemeToggle',
    'LanguageSwitcher',
  ];

  it('defines each block in pageDefinitions with valid defaults', () => {
    for (const type of chromeTypes) {
      const def = pageDefinitions[type];
      assert.ok(def, `Missing definition for ${type}`);
      const defaults = defaultProps(def) as Record<string, unknown>;
      assert.ok(defaults, `Missing defaults for ${type}`);
      const validation = validateProps(def, defaults);
      assert.equal(
        validation.ok,
        true,
        `${type} defaults failed validation: ${JSON.stringify(validation)}`
      );
    }
  });

  it('HeaderBar has left, center, right slots and column layout options', () => {
    const setup = editorSetup('header');
    assert.ok(setup.schemas.HeaderBar.slots?.left);
    assert.ok(setup.schemas.HeaderBar.slots?.center);
    assert.ok(setup.schemas.HeaderBar.slots?.right);
    assert.ok(setup.inspectorBlocks.HeaderBar.fields.layout);
  });

  it('HeaderColumns has col1 through col6 slots', () => {
    const setup = editorSetup('header');
    assert.ok(setup.schemas.HeaderColumns.slots?.col1);
    assert.ok(setup.schemas.HeaderColumns.slots?.col2);
    assert.ok(setup.schemas.HeaderColumns.slots?.col3);
    assert.ok(setup.schemas.HeaderColumns.slots?.col4);
    assert.ok(setup.schemas.HeaderColumns.slots?.col5);
    assert.ok(setup.schemas.HeaderColumns.slots?.col6);
  });

  it('FooterColumns has col1 through col6 slots', () => {
    const setup = editorSetup('footer');
    assert.ok(setup.schemas.FooterColumns.slots?.col1);
    assert.ok(setup.schemas.FooterColumns.slots?.col2);
    assert.ok(setup.schemas.FooterColumns.slots?.col3);
    assert.ok(setup.schemas.FooterColumns.slots?.col4);
    assert.ok(setup.schemas.FooterColumns.slots?.col5);
    assert.ok(setup.schemas.FooterColumns.slots?.col6);
  });
});

describe('Header & Footer starter templates', () => {
  it('provides valid header starter templates', () => {
    assert.ok(HEADER_STARTERS.length >= 4);
    for (const starter of HEADER_STARTERS) {
      assert.equal(starter.category, 'Header');
      assert.ok(starter.name);
      assert.ok(starter.content.content.length > 0);
      assert.ok(starter.content.root.props);
      const retrieved = getStarterContent('Header', starter.key);
      assert.ok(retrieved);
      assert.deepEqual(retrieved, starter.content);
    }
  });

  it('provides valid footer starter templates', () => {
    assert.ok(FOOTER_STARTERS.length >= 3);
    for (const starter of FOOTER_STARTERS) {
      assert.equal(starter.category, 'Footer');
      assert.ok(starter.name);
      assert.ok(starter.content.content.length > 0);
      assert.ok(starter.content.root.props);
      const retrieved = getStarterContent('Footer', starter.key);
      assert.ok(retrieved);
      assert.deepEqual(retrieved, starter.content);
    }
  });

  it('returns null for blank starter key', () => {
    assert.equal(getStarterContent('Header', 'blank'), null);
    assert.equal(getStarterContent('Footer', 'blank'), null);
    assert.equal(getStarterContent('Header', undefined), null);
  });

  for (const [category, starters, required] of [
    ['Search', SEARCH_STARTERS, 'SearchResults'],
    ['Archive', ARCHIVE_STARTERS, 'QueryLoop'],
  ] as const) {
    it(`provides valid ${category.toLowerCase()} starter templates`, () => {
      assert.ok(starters.length >= 2);
      for (const starter of starters) {
        assert.equal(starter.category, category);
        const types = starter.content.content.map(b => b.type);
        assert.ok(types.includes(required), `${starter.key} lacks ${required}`);
        for (const block of starter.content.content) {
          const def = pageDefinitions[block.type as keyof typeof pageDefinitions];
          assert.ok(def, `Unknown block ${block.type}`);
          const validation = validateProps(def, block.props);
          assert.equal(validation.ok, true, `${starter.key}/${block.type} props invalid`);
        }
        assert.deepEqual(getStarterContent(category, starter.key), starter.content);
      }
      assert.equal(getStarterContent(category, 'blank'), null);
    });
  }
});

describe('normalizeGlobalContent', () => {
  it('preserves root.props and normalizes content and zones', () => {
    const raw = {
      root: {
        props: {
          sticky: 'always',
          transparent: true,
          zIndex: 60,
        },
      },
      content: [
        {
          type: 'HeaderBar',
          props: { id: 'bar-1' },
        },
      ],
      zones: {
        'bar-1:left': [{ type: 'Logo', props: { id: 'logo-1' } }],
      },
    };

    const normalized = normalizeGlobalContent(raw);
    const rootProps = normalized.root.props as Record<string, unknown>;
    assert.equal(rootProps.sticky, 'always');
    assert.equal(rootProps.transparent, true);
    assert.equal(rootProps.zIndex, 60);
    assert.equal(normalized.content.length, 1);
    assert.equal(normalized.zones?.['bar-1:left']?.length, 1);
  });

  it('handles empty or legacy array formats gracefully with empty root props', () => {
    const rawArray = [{ type: 'Logo', props: { id: 'logo-1' } }];
    const normalized = normalizeGlobalContent(rawArray);
    assert.deepEqual(normalized.root.props, {});
    assert.equal(normalized.content.length, 1);
  });
});

describe('menuHref', () => {
  it('prefixes site slug without duplicate prefixes', () => {
    assert.equal(menuHref('/about', 'acme'), '/acme/about');
    assert.equal(menuHref('/acme/about', 'acme'), '/acme/about');
    assert.equal(menuHref('/acme', 'acme'), '/acme');
    assert.equal(menuHref('https://external.com', 'acme'), 'https://external.com');
  });
});

describe('SearchBox block and live search configuration', () => {
  it('SearchBoxBlock defaults to inline mode with liveResults enabled and right alignment', () => {
    const def = pageDefinitions.SearchBox;
    assert.ok(def);
    const defaults = defaultProps(def) as Record<string, unknown>;
    assert.equal(defaults.mode, 'inline');
    assert.equal(defaults.placeholder, 'Search...');
    assert.equal(defaults.liveResults, true);
    assert.equal(defaults.align, 'right');
  });

  it('validates custom props for SearchBox', () => {
    const def = pageDefinitions.SearchBox;
    const valid = validateProps(def, {
      mode: 'icon-modal',
      placeholder: 'Search documentation...',
      liveResults: false,
      align: 'left',
    });
    assert.equal(valid.ok, true);

    const invalid = validateProps(def, {
      mode: 'unsupported-mode' as any,
    });
    assert.equal(invalid.ok, false);
  });
});

describe('resolveChromeStyle', () => {
  it('returns empty result when no style or legacy input provided', () => {
    const empty = resolveChromeStyle();
    assert.deepEqual(empty.classes, []);
    assert.deepEqual(empty.style, {});
  });

  it('emits vars only for valid values and rejects unsafe colors', () => {
    const res = resolveChromeStyle({
      textColor: '#112233',
      linkColor: 'rgba(255, 0, 0, 0.8)',
      linkHoverColor: 'javascript:alert(1)', // unsafe -> rejected
      scrolled: {
        textColor: 'invalid-color-value', // invalid -> rejected
        linkColor: '#445566',
      },
    });

    assert.ok(res.classes.includes('has-link-color'));
    assert.ok(!res.classes.includes('has-link-hover-color'));
    assert.ok(res.classes.includes('has-scrolled-style'));

    const s = res.style as Record<string, string>;
    assert.equal(s.color, '#112233');
    assert.equal(s['--chrome-link'], 'rgba(255, 0, 0, 0.8)');
    assert.equal(s['--chrome-link-hover'], undefined);
    assert.equal(s['--chrome-scrolled-fg'], undefined);
    assert.equal(s['--chrome-scrolled-link'], '#445566');
  });

  it('maps legacy footer background without adding padding', () => {
    const resLegacy = resolveChromeStyle(undefined, {
      background: 'inverted',
    });

    assert.ok(resLegacy.classes.includes('s-section-dark'));
    assert.ok(!resLegacy.classes.includes('s-pt'));
    assert.ok(!resLegacy.classes.includes('s-pb'));
    const s = resLegacy.style as Record<string, string>;
    assert.equal(s['--s-pt-d'], undefined);
    assert.equal(s['--s-pb-d'], undefined);
  });

  it('handles responsive minHeight and boxed contentWidth', () => {
    const res = resolveChromeStyle({
      contentWidth: 'boxed',
      maxWidth: { desktop: 1200, tablet: 700, mobile: 360 },
      maxWidthUnit: 'px',
      minHeight: { desktop: 80, tablet: 60, mobile: 50 },
      minHeightUnit: 'px',
    });

    assert.ok(res.classes.includes('is-boxed'));
    assert.ok(res.classes.includes('s-mh'));
    const s = res.style as Record<string, string>;
    assert.equal(s['--chrome-max-width-d'], '1200px');
    assert.equal(s['--chrome-max-width-t'], '700px');
    assert.equal(s['--chrome-max-width-m'], '360px');
    assert.equal(s['--s-mh-d'], '80px');
    assert.equal(s['--s-mh-t'], '60px');
    assert.equal(s['--s-mh-m'], '50px');
  });

  it('resolves header scrolled and transparent state properties', () => {
    const res = resolveChromeStyle({
      transparentTextColor: '#ffffff',
      scrolled: {
        fill: { type: 'color', color: '#111827', colorDark: '#030712' },
        textColor: '#f9fafb',
        linkColor: '#60a5fa',
      },
    });

    assert.ok(res.classes.includes('has-transparent-style'));
    assert.ok(res.classes.includes('has-scrolled-style'));
    const s = res.style as Record<string, string>;
    assert.equal(s['--chrome-transparent-fg'], '#ffffff');
    assert.equal(s['--chrome-scrolled-fill'], '#111827');
    assert.equal(s['--chrome-scrolled-fill-dark'], '#030712');
    assert.equal(s['--chrome-scrolled-fg'], '#f9fafb');
    assert.equal(s['--chrome-scrolled-link'], '#60a5fa');
  });
});
