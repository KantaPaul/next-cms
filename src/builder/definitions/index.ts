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
import { LoopPreviewItemField } from '../controls/loop-preview';

/** Blocks offered only inside a collection's own entry/entry-template builders. */
const COLLECTION_ONLY_BLOCKS: ReadonlySet<string> = new Set(['CollectionBlock']);

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

export const pageRootFields = PAGE_ROOT_FIELDS as Record<string, FieldDef>;

const customGroups: BlockGroup[] = [
  {
    title: 'Custom UI Components',
    types: customBlockDefinitions.map(b => b.type),
  },
];

export const pageBlockGroups: BlockGroup[] = [
  ...Object.entries(CATEGORIES)
    .filter(([key]) => key !== 'post' && key !== 'header' && key !== 'footer')
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
  NATIVE_BLOCKS.map(block => [block.type, withInfo(block)])
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
  const skipSet = new Set([...skip, 'header', 'footer']);
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

/** Root settings for the Loop Item editor: which item to preview, and how wide. */
const LOOP_ITEM_ROOT_FIELDS: Record<string, FieldDef> = {
  previewItemId: {
    label: 'Preview with',
    type: 'custom',
    render: LoopPreviewItemField,
  } as FieldDef,
  previewWidth: {
    label: 'Preview width',
    type: 'select',
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
  if (kind === 'entry' || kind === 'entry-template') return setup;
  const strip = <T,>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).filter(([type]) => !COLLECTION_ONLY_BLOCKS.has(type))
    ) as Record<string, T>;
  return {
    ...setup,
    schemas: strip(setup.schemas) as BlockSchemas,
    inspectorBlocks: strip(setup.inspectorBlocks),
  };
}

function baseEditorSetup(kind: string): EditorSetup {
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
      groups: isCollectionEntry
        ? [
            { title: 'Collection blocks', types: ['CollectionBlock'] },
            ...groupsOf([]),
          ]
        : groupsOf([]),
      renderKind: 'post',
    };
  }
  if (kind === 'collection-block') {
    return {
      definitions: collectionDesignDefinitions,
      schemas: schemasOf(collectionDesignDefinitions),
      inspectorBlocks: inspectorOf(collectionDesignDefinitions),
      rootFields: PAGE_ROOT_FIELDS as Record<string, FieldDef>,
      groups: groupsOf([]),
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