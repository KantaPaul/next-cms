/**
 * Every page block for the new editor: native definitions only.
 */

import {
  type BlockDefinition,
  type BlockSchemas,
  type FieldDef,
  fieldsOf,
  toBlockSchema,
} from '@nextcms/builder-core';
import type { BlockGroup, InspectorBlock } from '@nextcms/builder-react';
import {
  CATEGORIES,
  FOOTER_ROOT_FIELDS,
  HEADER_ROOT_FIELDS,
  NATIVE_BLOCKS,
  PAGE_ROOT_FIELDS,
} from './native';
import { withInfo } from './info';
import { customBlockDefinitions } from '../custom';
import {
  PLUGIN_BLOCK_OWNER,
  pluginBlockDefinitions,
} from '@/plugins/client-blocks';
import { LoopPreviewItemField } from '../controls/loop-preview';
import {
  OverlayBackdropField,
  OverlayBackgroundField,
  OverlayHeightField,
  OverlayPaddingField,
  OverlayRadiusField,
  OverlayWidthField,
} from '../controls/overlay-layout';
import { CollectionBlockPreviewField } from '../fields/client-fields';

/** Blocks offered only inside a collection's own entry/entry-template builders. */
const COLLECTION_ONLY_BLOCKS: ReadonlySet<string> = new Set(['CollectionBlock']);

/** Blocks offered only inside the mega menu builder. */
const MEGA_MENU_ONLY_BLOCKS: ReadonlySet<string> = new Set(['MegaMenuCard']);

/**
 * The mega menu builder's palette. Anything not listed here is unavailable:
 * no page sections, loops, forms, embeds, or menus inside a menu.
 */
export const MEGA_MENU_GROUPS: BlockGroup[] = [
  { title: 'Layout', types: ['Columns', 'Container', 'Spacer'] },
  { title: 'Links', types: ['FooterLinks', 'Button'] },
  { title: 'Featured', types: ['MegaMenuCard', 'BlogPosts', 'Image'] },
  { title: 'Content', types: ['RichText', 'SocialIcons', 'ContactInfo'] },
];

/** Shared controls a panel inside a dropdown has no use for. */
const MEGA_MENU_OMIT_FIELDS = [
  'section_animation', // the panel animates as a whole
  'section_filter',
  'section_responsive', // mega menus are desktop-only
  'section_attributes', // anchors
];

/** Block-specific controls that only make sense on a full page. */
const MEGA_MENU_OMIT_BLOCK_FIELDS: Record<string, string[]> = {
  FooterLinks: ['collapseOnMobile'],
  BlogPosts: [
    'showSearch',
    'showCategoryFilter',
    'showTagFilter',
    'showSort',
    'showPagination',
  ],
};

/** Renamed for the mega menu palette. */
const MEGA_MENU_LABELS: Record<string, string> = {
  FooterLinks: 'Link list',
  BlogPosts: 'Latest posts',
};

export const pageDefinitions: Record<string, BlockDefinition> = Object.fromEntries(
  [...NATIVE_BLOCKS, ...customBlockDefinitions].map(block => [block.type, withInfo(block)])
);

export const nativeBlockTypes = NATIVE_BLOCKS.map(block => block.type);

export const pageSchemas: BlockSchemas = Object.fromEntries(
  Object.values(pageDefinitions).map(definition => [definition.type, toBlockSchema(definition)])
);

export const pageInspectorBlocks: Record<string, InspectorBlock> = Object.fromEntries(
  Object.values(pageDefinitions).map(definition => [
    definition.type,
    {
      label: definition.label,
      fields: fieldsOf(definition),
      tabs: definition.tabs,
      defaultProps: definition.defaults
        ? typeof definition.defaults === 'function'
          ? definition.defaults({})
          : definition.defaults
        : undefined,
    },
  ])
);

export const pageRootFields: Record<string, FieldDef> = {
  title: {
    type: 'text',
    label: 'Title',
    tab: 'content',
    section: 'Page',
  },
  ...(PAGE_ROOT_FIELDS as Record<string, FieldDef>),
};

const nonPluginCustomBlocks = customBlockDefinitions.filter(
  b => !(b.type in PLUGIN_BLOCK_OWNER)
);

const customGroups: BlockGroup[] = [
  ...(nonPluginCustomBlocks.length > 0
    ? [
        {
          title: 'Custom UI Components',
          types: nonPluginCustomBlocks.map(b => b.type),
        },
      ]
    : []),
  ...(pluginBlockDefinitions.length > 0
    ? [
        {
          title: 'Plugins',
          types: pluginBlockDefinitions.map(b => b.type),
        },
      ]
    : []),
];

export const pageBlockGroups: BlockGroup[] = [
  ...Object.entries(CATEGORIES)
    .filter(
      ([key]) =>
        key !== 'post' && key !== 'header' && key !== 'footer' && key !== 'megamenu'
    )
    .map(([, category]: any) => ({
      title: category.title ?? '',
      types: (category.components ?? []).map(String).filter(
        (type: string) => !COLLECTION_ONLY_BLOCKS.has(type)
      ),
    }))
    .filter(group => group.types.length > 0),
  ...customGroups,
];

const postDefinitions: Record<string, BlockDefinition> = Object.fromEntries(
  [...NATIVE_BLOCKS, ...pluginBlockDefinitions].map(block => [
    block.type,
    withInfo(block),
  ])
);

const collectionDesignDefinitions: Record<string, BlockDefinition> =
  Object.fromEntries(
    NATIVE_BLOCKS.filter(
      block => block.type !== 'GlobalRef' && block.type !== 'CollectionBlock'
    ).map(block => [block.type, withInfo(block)])
  );

const groupsOf = (
  skip: string[] = ['header', 'footer'],
  omitTypes: ReadonlySet<string> = COLLECTION_ONLY_BLOCKS
): BlockGroup[] => {
  const skipSet = new Set([...skip, 'header', 'footer', 'megamenu']);
  return Object.entries(CATEGORIES)
    .filter(([key]) => !skipSet.has(key))
    .map(([, category]: any) => ({
      title: category.title ?? '',
      types: (category.components ?? [])
        .map(String)
        .filter((type: string) => !omitTypes.has(type)),
    }))
    .filter(group => group.types.length > 0);
};

const schemasOf = (definitions: Record<string, BlockDefinition>): BlockSchemas =>
  Object.fromEntries(
    Object.values(definitions).map(definition => [definition.type, toBlockSchema(definition)])
  );

const inspectorOf = (definitions: Record<string, BlockDefinition>): Record<string, InspectorBlock> =>
  Object.fromEntries(
    Object.values(definitions).map(definition => [
      definition.type,
      {
        label: definition.label,
        fields: fieldsOf(definition),
        defaultProps: definition.defaults
          ? typeof definition.defaults === 'function'
            ? definition.defaults({})
            : definition.defaults
          : undefined,
      },
    ])
  );

export type EditorSetup = {
  definitions: Record<string, BlockDefinition>;
  schemas: BlockSchemas;
  inspectorBlocks: Record<string, InspectorBlock>;
  rootFields: Record<string, FieldDef>;
  groups: BlockGroup[];
  renderKind: 'page' | 'post';
};

/** Blocks that can't sit inside a Loop Item: other loops, listings and global refs. */
const LOOP_ITEM_EXCLUDED = new Set([
  'LoopGrid',
  'QueryLoop',
  'QueryFilter',
  'SearchResults',
  'BlogPosts',
  'PostTypeEntries',
  'GlobalRef',
  'CollectionBlock',
]);

/** Root settings for the collection block builder: preview entry first. */
const COLLECTION_BLOCK_ROOT_FIELDS: Record<string, FieldDef> = {
  previewEntry: {
    label: 'Preview with',
    type: 'custom',
    tab: 'content',
    section: 'Preview',
    render: CollectionBlockPreviewField,
  } as FieldDef,
  ...(PAGE_ROOT_FIELDS as Record<string, FieldDef>),
};

/** Root settings for the Loop Item editor: which item to preview, and how wide. */
const LOOP_ITEM_ROOT_FIELDS: Record<string, FieldDef> = {
  previewItemId: {
    label: 'Preview with',
    type: 'custom',
    tab: 'content',
    section: 'Preview',
    render: LoopPreviewItemField,
  } as FieldDef,
  previewWidth: {
    label: 'Preview width',
    type: 'select',
    tab: 'content',
    section: 'Preview',
    options: [
      { label: 'Narrow card (320px)', value: '320' },
      { label: 'Card (400px)', value: '400' },
      { label: 'Wide card (560px)', value: '560' },
      { label: 'List row (960px)', value: '960' },
    ],
  } as FieldDef,
};

/**
 * Editor setup per kind. Collection-only blocks (CollectionBlock) stay in
 * `definitions` everywhere so stored content renders and validates, but only
 * collection entry/template editors can insert or inspect them: the insert
 * panel lists every schema it knows, so other editors drop their schemas.
 */
export function editorSetup(kind: string): EditorSetup {
  const setup = baseEditorSetup(kind);
  if (kind === 'mega-menu' || kind === 'popup' || kind === 'drawer') return setup;
  const keepCollection = kind === 'entry' || kind === 'entry-template';
  const strip = <T,>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).filter(
        ([type]) =>
          !MEGA_MENU_ONLY_BLOCKS.has(type) &&
          (keepCollection || !COLLECTION_ONLY_BLOCKS.has(type))
      )
    ) as Record<string, T>;
  return {
    ...setup,
    schemas: strip(setup.schemas) as BlockSchemas,
    inspectorBlocks: strip(setup.inspectorBlocks),
  };
}

/** Panel settings for the mega menu builder's root (replaces page settings). */
export const MEGA_MENU_ROOT_FIELDS: Record<string, FieldDef> = {
  previewWidth: {
    label: 'Preview width',
    type: 'select',
    tab: 'content',
    section: 'Preview',
    group: 'Panel',
    options: [
      { label: 'Site width', value: 'container' },
      { label: 'Full width', value: 'full' },
      { label: 'Fit content', value: 'auto' },
    ],
  } as FieldDef,
  background: {
    label: 'Background',
    type: 'select',
    tab: 'style',
    section: 'Panel',
    group: 'Panel',
    options: [
      { label: 'Site background', value: 'default' },
      { label: 'Muted', value: 'muted' },
      { label: 'Dark', value: 'inverted' },
    ],
  } as FieldDef,
  padding: {
    label: 'Padding',
    type: 'select',
    tab: 'style',
    section: 'Panel',
    group: 'Panel',
    options: [
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  } as FieldDef,
  radius: {
    label: 'Corner radius',
    type: 'select',
    tab: 'style',
    section: 'Panel',
    group: 'Panel',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  } as FieldDef,
  shadow: {
    label: 'Shadow',
    type: 'select',
    tab: 'style',
    section: 'Panel',
    group: 'Panel',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  } as FieldDef,
  maxHeight: {
    label: 'Max height (px, 0 = none)',
    type: 'number',
    tab: 'style',
    section: 'Panel',
    group: 'Panel',
  } as FieldDef,
};

function megaMenuEditorSetup(): EditorSetup {
  const allowed = new Set(MEGA_MENU_GROUPS.flatMap(group => group.types));
  const definitions = Object.fromEntries(
    Object.entries(pageDefinitions)
      .filter(([type]) => allowed.has(type) || type === 'Column')
      .map(([type, definition]) => {
        const omit = new Set([
          ...MEGA_MENU_OMIT_FIELDS,
          ...(MEGA_MENU_OMIT_BLOCK_FIELDS[type] ?? []),
        ]);
        const fields = Object.fromEntries(
          Object.entries(definition.fields ?? {}).filter(([key]) => !omit.has(key))
        );
        // Layout slots would otherwise accept any page block. Columns slots
        // keep Column, while Column's content slot applies the mega-menu allow list.
        const slots = definition.slots
          ? Object.fromEntries(
              Object.entries(definition.slots).map(([key, slot]) => [
                key,
                key === 'columns'
                  ? { ...slot, allow: ['Column'] }
                  : {
                      ...slot,
                      allow: [...allowed].filter(
                        t =>
                          !(type === 'Columns' && t === 'Columns') &&
                          !(type === 'Column' && t === 'Columns')
                      ),
                    },
              ])
            )
          : definition.slots;
        return [
          type,
          {
            ...definition,
            label: MEGA_MENU_LABELS[type] ?? definition.label,
            fields,
            slots,
          } as BlockDefinition,
        ];
      })
  );
  // Fields are also generated from schema keys, so drop omitted keys again.
  const inspectorBlocks = Object.fromEntries(
    Object.entries(inspectorOf(definitions)).map(([type, block]) => {
      const omit = new Set([
        ...MEGA_MENU_OMIT_FIELDS,
        ...(MEGA_MENU_OMIT_BLOCK_FIELDS[type] ?? []),
      ]);
      return [
        type,
        {
          ...block,
          fields: Object.fromEntries(
            Object.entries(block.fields).filter(([key]) => !omit.has(key))
          ),
        },
      ];
    })
  );
  return {
    definitions,
    schemas: schemasOf(definitions),
    inspectorBlocks,
    rootFields: MEGA_MENU_ROOT_FIELDS,
    groups: MEGA_MENU_GROUPS,
    renderKind: 'page',
  };
}

export const OVERLAY_POPUP_POSITIONS = [
  { label: 'Center modal', value: 'center' },
  { label: 'Top bar', value: 'top' },
  { label: 'Bottom bar', value: 'bottom' },
  { label: 'Top-left corner', value: 'top-left' },
  { label: 'Top-right corner', value: 'top-right' },
  { label: 'Bottom-left corner', value: 'bottom-left' },
  { label: 'Bottom-right corner', value: 'bottom-right' },
];

export const OVERLAY_DRAWER_POSITIONS = [
  { label: 'Right slide-in', value: 'right' },
  { label: 'Left slide-in', value: 'left' },
  { label: 'Top slide-in', value: 'top' },
  { label: 'Bottom slide-in', value: 'bottom' },
];

export const OVERLAY_ALLOWED_TYPES: readonly string[] = [
  'Container',
  'Columns',
  'Heading',
  'RichText',
  'Image',
  'LightboxImage',
  'Button',
  'Newsletter',
  'ContactForm',
  'Spacer',
  'Divider',
  'OverlayClose',
];

export const OVERLAY_GROUPS: BlockGroup[] = [
  { title: 'Layout', types: ['Container', 'Columns', 'Spacer', 'Divider'] },
  { title: 'Content', types: ['Heading', 'RichText', 'Image', 'LightboxImage'] },
  {
    title: 'Actions & Conversion',
    types: ['Button', 'OverlayClose', 'Newsletter', 'ContactForm'],
  },
];

/** Reads a dotted path from overlay root props (fields store nested values via `path`). */
function rootValue(props: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[key]
          : undefined,
      props
    );
}

const PATH_RULE_ITEM: Record<string, FieldDef> = {
  kind: {
    label: 'Match',
    type: 'select',
    options: [
      { label: 'All pages', value: 'all' },
      { label: 'Path starts with', value: 'prefix' },
      { label: 'Exact path', value: 'exact' },
      { label: 'Post type', value: 'post-type' },
      { label: 'Page or post (id or slug)', value: 'entity' },
    ],
  } as FieldDef,
  value: {
    label: 'Value',
    type: 'text',
    placeholder: '/blog',
    when: (item: Record<string, unknown>) => item.kind !== 'all',
  } as FieldDef,
};

function pathRuleLabel(item: Record<string, unknown>): string {
  if (item.kind === 'all') return 'All pages';
  const prefix =
    item.kind === 'prefix'
      ? 'Starts with'
      : item.kind === 'exact'
        ? 'Exactly'
        : item.kind === 'post-type'
          ? 'Post type'
          : 'Entry';
  return `${prefix} ${String(item.value ?? '')}`.trim();
}

export function getOverlayRootFields(
  variant: 'popup' | 'drawer'
): Record<string, FieldDef> {
  const isPopup = variant === 'popup';
  const positionOptions = isPopup
    ? OVERLAY_POPUP_POSITIONS
    : OVERLAY_DRAWER_POSITIONS;
  const overlayCategory = isPopup ? 'Popup' : 'Drawer';
  /** Top and bottom drawers span the screen; left and right ones its height. */
  const isEdgeDrawer = (p: Record<string, unknown>) => {
    const position = rootValue(p, 'layout.position');
    return !isPopup && (position === 'top' || position === 'bottom');
  };

  const rawFields: Record<string, FieldDef> = {
    // Layout tab
    position: {
      label: 'Position',
      type: 'select',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.position',
      options: positionOptions,
    } as FieldDef,
    width: {
      label: 'Width',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.width',
      overlayCategory,
      render: OverlayWidthField,
      when: (p: Record<string, unknown>) => !isEdgeDrawer(p),
    } as unknown as FieldDef,
    maxHeight: {
      label: 'Max height',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.maxHeight',
      overlayCategory,
      render: OverlayHeightField,
      when: (p: Record<string, unknown>) => isPopup || isEdgeDrawer(p),
    } as unknown as FieldDef,
    background: {
      label: 'Background color',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.background',
      overlayCategory,
      render: OverlayBackgroundField,
    } as unknown as FieldDef,
    padding: {
      label: 'Padding',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.padding',
      overlayCategory,
      render: OverlayPaddingField,
    } as unknown as FieldDef,
    radius: {
      label: 'Corner radius',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.radius',
      overlayCategory,
      render: OverlayRadiusField,
    } as unknown as FieldDef,
    animation: {
      label: 'Animation',
      type: 'select',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.animation',
      options: [
        { label: 'Scale', value: 'scale' },
        { label: 'Slide', value: 'slide' },
        { label: 'Fade', value: 'fade' },
        { label: 'None', value: 'none' },
      ],
    } as FieldDef,
    overlay: {
      label: 'Dim backdrop overlay',
      type: 'toggle',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.overlay',
    } as FieldDef,
    overlayColor: {
      label: 'Backdrop color',
      type: 'custom',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.overlayColor',
      overlayCategory,
      render: OverlayBackdropField,
      when: (p: Record<string, unknown>) =>
        rootValue(p, 'layout.overlay') !== false,
    } as unknown as FieldDef,
    closeOnOverlay: {
      label: 'Close on backdrop click',
      type: 'toggle',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.closeOnOverlay',
    } as FieldDef,
    closeOnEsc: {
      label: 'Close on Escape key',
      type: 'toggle',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.closeOnEsc',
    } as FieldDef,
    showCloseButton: {
      label: 'Show corner close button (X)',
      type: 'toggle',
      tab: 'layout',
      group: 'Layout',
      path: 'layout.showCloseButton',
    } as FieldDef,

    // Trigger tab
    triggerType: {
      label: 'Trigger type',
      type: 'select',
      tab: 'trigger',
      group: 'Trigger',
      path: 'trigger.type',
      options: [
        { label: 'Page load (immediate)', value: 'load' },
        { label: 'Time delay', value: 'delay' },
        { label: 'Scroll depth', value: 'scroll' },
        { label: 'Exit intent', value: 'exit' },
        { label: 'Click on element', value: 'click' },
      ],
    } as FieldDef,
    delaySec: {
      label: 'Delay in seconds',
      type: 'number',
      tab: 'trigger',
      group: 'Trigger',
      path: 'trigger.delaySec',
      when: p => rootValue(p, 'trigger.type') === 'delay',
    } as FieldDef,
    scrollPercent: {
      label: 'Scroll depth (%)',
      type: 'number',
      tab: 'trigger',
      group: 'Trigger',
      path: 'trigger.scrollPercent',
      when: p => rootValue(p, 'trigger.type') === 'scroll',
    } as FieldDef,
    selector: {
      label: 'Click selector (e.g. .open-cta)',
      type: 'text',
      tab: 'trigger',
      group: 'Trigger',
      path: 'trigger.selector',
      when: p => rootValue(p, 'trigger.type') === 'click',
    } as FieldDef,

    // Targeting tab
    userState: {
      label: 'Target visitors',
      type: 'select',
      tab: 'targeting',
      group: 'Targeting',
      path: 'targeting.userState',
      options: [
        { label: 'All visitors', value: 'all' },
        { label: 'Guests only', value: 'guest' },
        { label: 'Logged-in members only', value: 'logged-in' },
      ],
    } as FieldDef,
    includePaths: {
      label: 'Show on',
      description: 'Leave empty to show on every page.',
      type: 'list',
      tab: 'targeting',
      group: 'Targeting',
      path: 'targeting.include',
      item: PATH_RULE_ITEM,
      defaultItem: { kind: 'prefix', value: '/' },
      itemLabel: pathRuleLabel,
    } as FieldDef,
    excludePaths: {
      label: 'Never show on',
      description: 'Exclusions win over the rules above.',
      type: 'list',
      tab: 'targeting',
      group: 'Targeting',
      path: 'targeting.exclude',
      item: PATH_RULE_ITEM,
      defaultItem: { kind: 'exact', value: '/' },
      itemLabel: pathRuleLabel,
    } as FieldDef,
    deviceSet: {
      label: 'Devices',
      type: 'select',
      tab: 'targeting',
      group: 'Targeting',
      path: 'targeting.deviceSet',
      options: [
        { label: 'All devices', value: 'all' },
        { label: 'Desktop only', value: 'desktop' },
        { label: 'Desktop & tablet', value: 'desktop-tablet' },
        { label: 'Tablet & mobile', value: 'tablet-mobile' },
        { label: 'Mobile only', value: 'mobile' },
      ],
    } as FieldDef,

    // Frequency tab
    frequencyMode: {
      label: 'Frequency',
      type: 'select',
      tab: 'frequency',
      group: 'Frequency',
      path: 'frequency.mode',
      options: [
        { label: 'Every page load', value: 'every-page' },
        { label: 'Once per session', value: 'once-session' },
        { label: 'Once every X days', value: 'once-per-days' },
        { label: 'Once ever (permanent)', value: 'once-ever' },
      ],
    } as FieldDef,
    days: {
      label: 'Days between displays',
      type: 'number',
      tab: 'frequency',
      group: 'Frequency',
      path: 'frequency.days',
      when: p => rootValue(p, 'frequency.mode') === 'once-per-days',
    } as FieldDef,
    stopAfterConversion: {
      label: 'Stop after conversion',
      type: 'toggle',
      tab: 'frequency',
      group: 'Frequency',
      path: 'frequency.stopAfterConversion',
    } as FieldDef,

    // Schedule tab
    enabled: {
      label: 'Overlay enabled',
      type: 'toggle',
      tab: 'schedule',
      group: 'Schedule',
      path: 'enabled',
    } as FieldDef,
    startsAt: {
      label: 'Start date & time (ISO)',
      type: 'text',
      tab: 'schedule',
      group: 'Schedule',
      path: 'startsAt',
    } as FieldDef,
    endsAt: {
      label: 'End date & time (ISO)',
      type: 'text',
      tab: 'schedule',
      group: 'Schedule',
      path: 'endsAt',
    } as FieldDef,
  };

  return Object.fromEntries(
    Object.entries(rawFields).map(([key, field]) => [
      key,
      {
        ...field,
        section: field.section ?? field.group,
      },
    ])
  );
}

export function overlayEditorSetup(variant: 'popup' | 'drawer'): EditorSetup {
  const allowed = new Set(OVERLAY_ALLOWED_TYPES);
  const definitions = Object.fromEntries(
    Object.entries(pageDefinitions)
      .filter(([type]) => allowed.has(type) || type === 'Column')
      .map(([type, definition]) => {
        const omit = new Set([
          'section_animation',
          'section_filter',
          'section_responsive',
          'section_attributes',
        ]);
        const fields = Object.fromEntries(
          Object.entries(definition.fields ?? {}).filter(
            ([key]) => !omit.has(key)
          )
        );
        const slots = definition.slots
          ? Object.fromEntries(
              Object.entries(definition.slots).map(([key, slot]) => [
                key,
                key === 'columns'
                  ? { ...slot, allow: ['Column'] }
                  : {
                      ...slot,
                      allow: [...allowed].filter(
                        t =>
                          !(type === 'Columns' && t === 'Columns') &&
                          !(type === 'Column' && t === 'Columns')
                      ),
                    },
              ])
            )
          : definition.slots;
        return [
          type,
          {
            ...definition,
            fields,
            slots,
          } as BlockDefinition,
        ];
      })
  );

  const inspectorBlocks = Object.fromEntries(
    Object.entries(inspectorOf(definitions)).map(([type, block]) => {
      const omit = new Set([
        'section_animation',
        'section_filter',
        'section_responsive',
        'section_attributes',
      ]);
      return [
        type,
        {
          ...block,
          fields: Object.fromEntries(
            Object.entries(block.fields).filter(([key]) => !omit.has(key))
          ),
        },
      ];
    })
  );

  return {
    definitions,
    schemas: schemasOf(definitions),
    inspectorBlocks,
    rootFields: getOverlayRootFields(variant),
    groups: OVERLAY_GROUPS,
    renderKind: 'page',
  };
}

function baseEditorSetup(kind: string): EditorSetup {
  if (kind === 'popup') return overlayEditorSetup('popup');
  if (kind === 'drawer') return overlayEditorSetup('drawer');
  if (kind === 'mega-menu') return megaMenuEditorSetup();
  if (kind === 'loop-item') {
    const definitions = Object.fromEntries(
      Object.entries(pageDefinitions).filter(
        ([type]) => !LOOP_ITEM_EXCLUDED.has(type)
      )
    );
    const groups = groupsOf(['global', 'post'])
      .map(group => ({
        ...group,
        types: group.types.filter(type => !LOOP_ITEM_EXCLUDED.has(type)),
      }))
      .filter(group => group.types.length > 0);
    return {
      definitions,
      schemas: schemasOf(definitions),
      inspectorBlocks: inspectorOf(definitions),
      rootFields: LOOP_ITEM_ROOT_FIELDS,
      groups: [
        { title: 'Loop Item', types: ['LoopItemField'] },
        ...groups.map(group => ({
          ...group,
          types: group.types.filter(type => type !== 'LoopItemField'),
        })),
      ].filter(group => group.types.length > 0),
      renderKind: 'page',
    };
  }

  if (kind === 'header' || kind === 'footer') {
    const { GlobalRef: _globalRef, ...definitions } = pageDefinitions;
    const headerGroup: BlockGroup = {
      title: CATEGORIES.header?.title ?? 'Header',
      types: (CATEGORIES.header?.components ?? []).map(String),
    };
    const footerGroup: BlockGroup = {
      title: CATEGORIES.footer?.title ?? 'Footer',
      types: (CATEGORIES.footer?.components ?? []).map(String),
    };

    const isHeader = kind === 'header';
    return {
      definitions,
      schemas: schemasOf(definitions),
      inspectorBlocks: inspectorOf(definitions),
      rootFields: (isHeader
        ? HEADER_ROOT_FIELDS
        : FOOTER_ROOT_FIELDS) as Record<string, FieldDef>,
      groups: isHeader ? [headerGroup, footerGroup] : [footerGroup, headerGroup],
      renderKind: 'page',
    };
  }
  if (
    kind === 'post' ||
    kind === 'post-template' ||
    kind === 'entry' ||
    kind === 'entry-template'
  ) {
    const isCollectionEntry = kind === 'entry' || kind === 'entry-template';
    return {
      definitions: postDefinitions,
      schemas: schemasOf(postDefinitions),
      inspectorBlocks: inspectorOf(postDefinitions),
      rootFields: PAGE_ROOT_FIELDS as Record<string, FieldDef>,
      groups: [
        ...(isCollectionEntry
          ? [{ title: 'Collection blocks', types: ['CollectionBlock'] }]
          : []),
        ...groupsOf([]),
        ...(pluginBlockDefinitions.length > 0
          ? [{ title: 'Plugins', types: pluginBlockDefinitions.map(b => b.type) }]
          : []),
      ],
      renderKind: 'post',
    };
  }
  if (kind === 'collection-block') {
    return {
      definitions: collectionDesignDefinitions,
      schemas: schemasOf(collectionDesignDefinitions),
      inspectorBlocks: inspectorOf(collectionDesignDefinitions),
      rootFields: COLLECTION_BLOCK_ROOT_FIELDS,
      groups: groupsOf(['global']),
      renderKind: 'post',
    };
  }
  if (kind === 'global' || kind === 'contact-form') {
    const { GlobalRef: _globalRef, ...definitions } = pageDefinitions;
    return {
      definitions,
      schemas: schemasOf(definitions),
      inspectorBlocks: inspectorOf(definitions),
      rootFields: {},
      groups: groupsOf(['global', 'post']),
      renderKind: 'page',
    };
  }
  return {
    definitions: pageDefinitions,
    schemas: pageSchemas,
    inspectorBlocks: pageInspectorBlocks,
    rootFields: pageRootFields,
    groups: pageBlockGroups,
    renderKind: 'page',
  };
}