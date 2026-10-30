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
import { CATEGORIES, NATIVE_BLOCKS, PAGE_ROOT_FIELDS } from './native';

export const pageDefinitions: Record<string, BlockDefinition> = Object.fromEntries(
  NATIVE_BLOCKS.map(block => [block.type, block])
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
      defaultProps: definition.defaults
        ? typeof definition.defaults === 'function'
          ? definition.defaults({})
          : definition.defaults
        : undefined,
    },
  ])
);

export const pageRootFields = PAGE_ROOT_FIELDS as Record<string, FieldDef>;

export const pageBlockGroups: BlockGroup[] = Object.entries(CATEGORIES)
  .filter(([key]) => key !== 'post')
  .map(([, category]: any) => ({
    title: category.title ?? '',
    types: (category.components ?? []).map(String),
  }));

const postDefinitions: Record<string, BlockDefinition> = Object.fromEntries(
  NATIVE_BLOCKS.map(block => [block.type, block])
);

const groupsOf = (skip: string[] = []): BlockGroup[] =>
  Object.entries(CATEGORIES)
    .filter(([key]) => !skip.includes(key))
    .map(([, category]: any) => ({
      title: category.title ?? '',
      types: (category.components ?? []).map(String),
    }));

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

export function editorSetup(kind: string): EditorSetup {
  if (kind === 'post' || kind === 'post-template') {
    return {
      definitions: postDefinitions,
      schemas: schemasOf(postDefinitions),
      inspectorBlocks: inspectorOf(postDefinitions),
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