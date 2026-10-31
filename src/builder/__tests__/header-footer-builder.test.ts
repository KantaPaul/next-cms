import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProps, validateProps } from '@nextcms/builder-core';
import { editorSetup, pageDefinitions } from '../definitions';
import { normalizeGlobalContent } from '../normalize-global-content';
import { menuHref } from '@/components/site/menu-links';

describe('Header & Footer builder palette and editor setup', () => {
  it('editorSetup(header) surfaces only header and footer palette groups, with Header first', () => {
    const setup = editorSetup('header');
    assert.equal(setup.groups.length, 2);
    assert.equal(setup.groups[0].title, 'Header');
    assert.equal(setup.groups[1].title, 'Footer');
    assert.ok(setup.groups[0].types.includes('HeaderBar'));
    assert.ok(setup.groups[0].types.includes('Logo'));
    assert.ok(setup.groups[0].types.includes('NavMenu'));
    assert.ok(setup.groups[0].types.includes('MobileMenu'));
    assert.ok(setup.groups[0].types.includes('SearchBox'));
    assert.ok(setup.groups[0].types.includes('AnnouncementBar'));
    assert.ok(setup.groups[1].types.includes('FooterColumns'));
    assert.ok(setup.groups[1].types.includes('Copyright'));
    assert.ok(setup.groups[1].types.includes('FooterLinks'));
    // Page blocks like Hero or Features must NOT be in palette groups
    assert.ok(!setup.groups[0].types.includes('Hero'));
    assert.ok(!setup.groups[1].types.includes('Features'));

    // Inspector still has definitions for container so legacy headers load
    assert.ok(setup.definitions.Container);
    assert.ok(!setup.definitions.GlobalRef); // no nesting global blocks

    // Root fields
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
    assert.ok(setup.rootFields.background);
    assert.ok(setup.rootFields.paddingY);
  });

  it('editorSetup(page) and editorSetup(global) palettes exclude header and footer blocks', () => {
    const pageSetup = editorSetup('page');
    const globalSetup = editorSetup('global');

    for (const group of pageSetup.groups) {
      assert.notEqual(group.title, 'Header');
      assert.notEqual(group.title, 'Footer');
      assert.ok(!group.types.includes('HeaderBar'));
      assert.ok(!group.types.includes('FooterColumns'));
    }

    for (const group of globalSetup.groups) {
      assert.notEqual(group.title, 'Header');
      assert.notEqual(group.title, 'Footer');
      assert.ok(!group.types.includes('HeaderBar'));
      assert.ok(!group.types.includes('FooterColumns'));
    }
  });
});

describe('Header & Footer block definitions and schemas', () => {
  const chromeTypes = [
    'HeaderBar',
    'FooterColumns',
    'Logo',
    'NavMenu',
    'Copyright',
    'FooterLinks',
    'MobileMenu',
    'SearchBox',
    'AnnouncementBar',
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

  it('HeaderBar has left, center, right slots', () => {
    const setup = editorSetup('header');
    assert.ok(setup.schemas.HeaderBar.slots?.left);
    assert.ok(setup.schemas.HeaderBar.slots?.center);
    assert.ok(setup.schemas.HeaderBar.slots?.right);
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
    assert.equal(normalized.zones['bar-1:left'].length, 1);
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
