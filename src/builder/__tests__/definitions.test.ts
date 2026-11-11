/**
 * Block definitions for the new editor (R697) must stay compatible with the
 * native block list: same blocks, defaults, slots, and rules.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/definitions.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  defaultProps,
  fieldSectionTitle,
  fieldsOf,
  fieldTabId,
  layoutFields,
  validateProps,
} from '@nextcms/builder-core';
import { NATIVE_BLOCKS } from '../definitions/native';
import {
  nativeBlockTypes,
  pageDefinitions,
  pageInspectorBlocks,
  pageRootFields,
  pageSchemas,
  editorSetup,
  getOverlayRootFields,
} from '../definitions';
import {
  contentSectionControls,
  elementStyle,
  contentFields,
  groupControl,
  sectionControls,
  TEXT_PARTS,
} from '../definitions/fields';

describe('page block definitions', () => {
  it('cover every native block', () => {
    const missing = NATIVE_BLOCKS.map(b => b.type).filter(
      type => !pageDefinitions[type]
    );
    assert.deepEqual(missing, []);
  });

  it('give native blocks the same defaults as their definition', () => {
    for (const type of nativeBlockTypes) {
      assert.ok(defaultProps(pageDefinitions[type]) !== undefined, type);
    }
  });

  it('accept their own defaults as valid props', () => {
    for (const type of nativeBlockTypes) {
      const props = defaultProps(pageDefinitions[type]) as Record<
        string,
        unknown
      >;
      assert.deepEqual(
        validateProps(pageDefinitions[type], props),
        { ok: true },
        type
      );
    }
  });

  it('accept element-level and section-level styles on every block that supports them', () => {
    for (const type of nativeBlockTypes) {
      const base = defaultProps(pageDefinitions[type]) as Record<
        string,
        unknown
      >;
      const withStyles: Record<string, unknown> = {
        ...base,
        elements: {
          title: {
            typography: {
              fontFamily: 'Inter',
              fontSize: { desktop: 48, tablet: 36, mobile: 28 },
              lineHeight: 56,
              lineHeightUnit: 'px',
            },
            fill: { type: 'color', color: '#111827' },
          },
        },
      };
      if ('section' in base) {
        withStyles.section = {
          ...(typeof base.section === 'object' && base.section
            ? base.section
            : {}),
          width: 1200,
          widthUnit: 'px',
          typography: {
            fontFamily: 'Inter',
            fontSize: 16,
            lineHeight: 24,
            lineHeightUnit: 'px',
          },
          fill: { type: 'color', color: '#ffffff' },
        };
      }
      assert.deepEqual(
        validateProps(pageDefinitions[type], withStyles),
        { ok: true },
        type
      );
    }
  });

  it('keep slots and nesting rules', () => {
    assert.deepEqual(pageSchemas.Columns.slots?.columns?.allow, ['Column']);
    assert.deepEqual(pageSchemas.Column.slots?.content?.disallow, [
      'Column',
      'Columns',
      'GlobalRef',
    ]);
    assert.deepEqual(pageSchemas.Column.parents, [
      'Columns',
      'HeaderBar',
      'HeaderColumns',
      'FooterColumns',
    ]);
    assert.ok(pageSchemas.Container.slots?.content);
    assert.ok(pageSchemas.Tabs.arraySlots?.items?.content);
  });

  it('give every block inspector fields, and the page its settings', () => {
    for (const [type, block] of Object.entries(pageInspectorBlocks)) {
      assert.ok(block.label, type);
    }
    assert.equal(pageInspectorBlocks.Hero.fields.title.type, 'textarea');
    assert.ok(
      pageInspectorBlocks.Hero.fields.section_background ||
        pageInspectorBlocks.Hero.fields.section
    );
    assert.equal(fieldsOf(pageDefinitions.Spacer).height.type, 'number');
    assert.ok(pageRootFields.maxWidth);
  });

  it('gives the page root fields title on page fields only, with tab and section placement', () => {
    // title is on pageRootFields only
    assert.ok(pageRootFields.title);
    assert.equal(pageRootFields.title.type, 'text');
    assert.equal(pageRootFields.title.tab, 'content');
    assert.equal(pageRootFields.title.section, 'Page');

    const pageSetup = editorSetup('page');
    assert.ok(pageSetup.rootFields.title);

    const postSetup = editorSetup('post');
    assert.equal(postSetup.rootFields.title, undefined);

    const entrySetup = editorSetup('entry');
    assert.equal(entrySetup.rootFields.title, undefined);

    // root fields have the new tab and section
    assert.equal(pageRootFields.maxWidth.tab, 'style');
    assert.equal(pageRootFields.maxWidth.section, 'Layout');

    assert.equal(pageRootFields.paddingY.tab, 'style');
    assert.equal(pageRootFields.paddingY.section, 'Layout');

    assert.equal(pageRootFields.theme.tab, 'style');
    assert.equal(pageRootFields.theme.section, 'Appearance');

    assert.equal(pageRootFields.pageTransition.tab, 'advanced');
    assert.equal(pageRootFields.pageTransition.section, 'Motion');
  });

  it('uses the global style controls for popup and drawer layout', () => {
    const fields = getOverlayRootFields('drawer');
    for (const key of [
      'width',
      'maxHeight',
      'background',
      'padding',
      'radius',
      'overlayColor',
    ]) {
      assert.equal(fields[key].type, 'custom', key);
    }

    const at = (position: string) => ({ layout: { position } });
    assert.equal(fields.width.when?.(at('right')), true);
    assert.equal(fields.width.when?.(at('top')), false);
    assert.equal(fields.maxHeight.when?.(at('left')), false);
    assert.equal(fields.maxHeight.when?.(at('bottom')), true);

    const popup = getOverlayRootFields('popup');
    assert.equal(popup.width.when?.(at('top')), true);
    assert.equal(popup.maxHeight.when?.(at('center')), true);
  });

  it('show conditional fields only when they apply', () => {
    const alt = pageInspectorBlocks.Hero.fields.imageAlt;
    assert.equal(alt.when?.({ imageUrl: '' }), false);
    assert.equal(alt.when?.({ imageUrl: '/a.jpg' }), true);
  });

  it('configures groupControl with exclude, defaults, and popover', () => {
    const field = groupControl('typography', {
      label: 'Title Typography',
      path: 'elements.title.typography',
      exclude: ['wordSpacing'],
      defaults: { fontSize: { desktop: 32 } },
      popover: true,
      states: ['normal', 'hover'],
      tab: 'style',
      section: 'Title',
    });

    assert.equal(field.type, 'custom');
    assert.equal(field.label, 'Title Typography');
    assert.equal(field.path, 'elements.title.typography');
    assert.equal((field as any).groupKind, 'typography');
    assert.deepEqual((field as any).exclude, ['wordSpacing']);
    assert.deepEqual((field as any).defaults, { fontSize: { desktop: 32 } });
    assert.equal((field as any).popover, true);
    assert.deepEqual((field as any).states, ['normal', 'hover']);
    assert.equal(typeof (field as any).render, 'function');
  });

  it('provides group controls for sectionControls', () => {
    const sc = sectionControls() as Record<string, any>;
    assert.equal(sc.section_typography.type, 'custom');
    assert.equal(sc.section_typography.groupKind, 'typography');

    assert.equal(sc.section_background.type, 'custom');
    assert.equal(sc.section_background.groupKind, 'background');
    assert.deepEqual(sc.section_background.states, ['normal', 'hover']);

    assert.equal(sc.section_border.type, 'custom');
    assert.equal(sc.section_border.groupKind, 'border');

    assert.equal(sc.section_filter.type, 'custom');
    assert.equal(sc.section_filter.groupKind, 'cssFilter');
    assert.deepEqual(sc.section_filter.states, ['normal', 'hover']);
  });

  it('contentSectionControls drops typography, text color and display by default, keeping display when requested', () => {
    const csc = contentSectionControls() as Record<string, any>;
    assert.equal(csc.section_typography, undefined);
    assert.equal(csc.section_text_color, undefined);
    assert.equal(csc.section_display, undefined);
    assert.ok(csc.section_background);
    assert.ok(csc.section_border);

    const cscWithDisplay = contentSectionControls({
      keepDisplay: true,
    }) as Record<string, any>;
    assert.equal(cscWithDisplay.section_typography, undefined);
    assert.equal(cscWithDisplay.section_text_color, undefined);
    assert.ok(cscWithDisplay.section_display);
    assert.ok(cscWithDisplay.section_background);
  });

  it('elementStyle honours when', () => {
    const field = elementStyle('title', 'Title Style', TEXT_PARTS, {
      when: (p: any) => p.showTitle === true,
    });
    assert.equal(typeof field.when, 'function');
    assert.equal(field.when?.({ showTitle: true }), true);
    assert.equal(field.when?.({ showTitle: false }), false);
  });

  it('scopes CollectionBlock to collection entry editors', () => {
    const entry = editorSetup('entry');
    const entryTemplate = editorSetup('entry-template');
    const collectionBlock = editorSetup('collection-block');
    const page = editorSetup('page');
    const post = editorSetup('post');

    assert.ok(entry.groups.some(g => g.types.includes('CollectionBlock')));
    assert.ok(
      entryTemplate.groups.some(g => g.types.includes('CollectionBlock'))
    );
    assert.ok(!page.groups.some(g => g.types.includes('CollectionBlock')));
    assert.ok(!post.groups.some(g => g.types.includes('CollectionBlock')));

    for (const kind of [
      'page',
      'post',
      'entry',
      'entry-template',
      'global',
      'header',
      'footer',
    ]) {
      // Still renderable everywhere, so stored content never breaks.
      assert.ok(editorSetup(kind).definitions.CollectionBlock, kind);
    }
    // No nesting: a collection block can't hold another, nor sit in a loop item.
    for (const kind of ['collection-block', 'loop-item']) {
      const setup = editorSetup(kind);
      assert.ok(!setup.definitions.CollectionBlock, kind);
      assert.ok(
        !setup.groups.some(g => g.types.includes('CollectionBlock')),
        kind
      );
    }
    assert.ok(!collectionBlock.definitions.GlobalRef);

    // Only collection editors can insert it: elsewhere the insert panel
    // (which lists every known schema) must not see it.
    for (const kind of [
      'page',
      'post',
      'global',
      'header',
      'footer',
      'loop-item',
    ]) {
      assert.ok(!editorSetup(kind).schemas.CollectionBlock, kind);
    }
    assert.ok(entry.schemas.CollectionBlock);
  });
});

describe('inspector tabs', () => {
  it('leaves no setting in the catch-all Style > General section', () => {
    const misplaced: string[] = [];
    for (const block of Object.values(NATIVE_BLOCKS) as any[]) {
      for (const [key, field] of Object.entries<any>(block.fields ?? {})) {
        if (
          fieldTabId(field) === 'style' &&
          fieldSectionTitle(field) === 'General'
        ) {
          misplaced.push(`${block.type}.${key}`);
        }
      }
    }
    assert.deepEqual(misplaced, []);
  });

  it('contentFields sends settings to Content and named ones to Appearance', () => {
    const fields = contentFields(
      {
        links: { label: 'Links', type: 'list' },
        shape: { label: 'Shape', type: 'radio' },
        link_style: {
          label: 'Link Style',
          type: 'custom',
          tab: 'style',
          section: 'Link Style',
        },
      } as any,
      { appearance: ['shape'] }
    ) as any;
    assert.equal(fieldTabId(fields.links), 'content');
    assert.equal(fieldTabId(fields.shape), 'style');
    assert.equal(fieldSectionTitle(fields.shape), 'Appearance');
    assert.equal(fieldSectionTitle(fields.link_style), 'Link Style');
  });
});

describe('QueryLoop filter panel styles', () => {
  const fields =
    (NATIVE_BLOCKS as any).QueryLoopBlock?.fields ??
    (Object.values(NATIVE_BLOCKS) as any[]).find(b => b.type === 'QueryLoop')
      .fields;

  it('hides the controls while the panel is off', () => {
    assert.equal(
      fields.filter_panel_style.when({ filterPosition: 'none' }),
      false
    );
    assert.equal(
      fields.filter_panel_style.when({ filterPosition: 'top' }),
      true
    );
  });

  it('follows the panel options', () => {
    assert.equal(
      fields.filter_drawer_toggle_style.when({
        filterPosition: 'top',
        filterMobileDrawer: false,
      }),
      false
    );
    assert.equal(
      fields.filter_active_chip_style.when({
        filterPosition: 'top',
        filterCategoryStyle: 'select',
        filterTagStyle: 'select',
      }),
      false
    );
  });
});

describe('Container redesigned inspector panel', () => {
  it('opens on Layout tab with Structure first and drops typography, display, and text alignment', () => {
    const block = pageInspectorBlocks.Container;
    assert.deepEqual(
      block.tabs?.map(t => t.id),
      ['layout', 'advanced']
    );

    assert.equal(block.fields.section_typography, undefined);
    assert.equal(block.fields.section_text_color, undefined);
    assert.equal(block.fields.section_display, undefined);
    assert.equal(block.fields.section_layout, undefined);

    const flexLayout = layoutFields({
      fields: block.fields,
      props: { container: { mode: 'flex' }, section: {} },
      defaultProps: block.defaultProps,
      device: 'desktop',
      tabs: block.tabs,
    });
    assert.deepEqual(
      flexLayout.tabs.map(t => t.def.id),
      ['layout', 'advanced']
    );
    assert.deepEqual(
      flexLayout.tabs[0].sections.map(s => s.title),
      [
        'Structure',
        'Flex',
        'Size',
        'Spacing',
        'Background',
        'Border & shadow',
        'Effects',
        'Element',
      ]
    );

    const gridLayout = layoutFields({
      fields: block.fields,
      props: { container: { mode: 'grid' }, section: {} },
      defaultProps: block.defaultProps,
      device: 'desktop',
      tabs: block.tabs,
    });
    assert.deepEqual(
      gridLayout.tabs[0].sections.map(s => s.title),
      [
        'Structure',
        'Grid',
        'Size',
        'Spacing',
        'Background',
        'Border & shadow',
        'Effects',
        'Element',
      ]
    );
  });

  it('keeps popup, drawer, and mega-menu Container omissions and tabs intact', () => {
    for (const kind of ['popup', 'drawer', 'mega-menu']) {
      const setup = editorSetup(kind);
      const container = setup.inspectorBlocks.Container;
      assert.ok(container, kind);
      assert.deepEqual(
        container.tabs?.map(t => t.id),
        ['layout', 'advanced'],
        kind
      );
      assert.ok(container.fields.container_structure, kind);
      assert.ok(container.fields.container_size, kind);
      assert.ok(container.fields.container_element, kind);
      assert.equal(container.fields.section_animation, undefined, kind);
      assert.equal(container.fields.section_filter, undefined, kind);
      assert.equal(container.fields.section_responsive, undefined, kind);
      assert.equal(container.fields.section_attributes, undefined, kind);
    }
  });
});
