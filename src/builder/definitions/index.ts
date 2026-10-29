/**
 * Every page block for the new editor: native definitions first, the rest
 * from the Puck config, with the derived editor schemas, inspector fields,
 * and insert groups.
 */

import {
  type BlockDefinition,
  type BlockSchemas,
  type FieldDef,
  fieldsOf,
  toBlockSchema,
} from '@nextcms/builder-core';
import type { BlockGroup, InspectorBlock } from '@nextcms/builder-react';
import type { Config } from '@measured/puck';
import { builderConfig, postBuilderConfig } from '../config';
import { rendererComponents } from '../renderer';
import { definitionsFromPuck, rootFieldsFromPuck } from './from-puck';
import { NATIVE_BLOCKS } from './native';

export const pageDefinitions: Record<string, BlockDefinition> = {
  ...definitionsFromPuck(builderConfig, rendererComponents('page')),
  ...Object.fromEntries(NATIVE_BLOCKS.map(block => [block.type, block])),
};

export const nativeBlockTypes = NATIVE_BLOCKS.map(block => block.type);

export const pageSchemas: BlockSchemas = Object.fromEntries(
  Object.values(pageDefinitions).map(definition => [definition.type, toBlockSchema(definition)])
);

export const pageInspectorBlocks: Record<string, InspectorBlock> = Object.fromEntries(
  Object.values(pageDefinitions).map(definition => [
    definition.type,
    { label: definition.label, fields: fieldsOf(definition) },
  ])
);

export const pageRootFields = rootFieldsFromPuck(builderConfig);

export const pageBlockGroups: BlockGroup[] = Object.values(builderConfig.categories ?? {}).map(
  category => ({ title: category.title ?? '', types: (category.components ?? []).map(String) })
);

const postDefinitions: Record<string, BlockDefinition> = {
  ...definitionsFromPuck(postBuilderConfig, rendererComponents('post')),
  ...Object.fromEntries(NATIVE_BLOCKS.map(block => [block.type, block])),
};

const groupsOf = (config: Config, skip: string[] = []): BlockGroup[] =>
  Object.entries(config.categories ?? {})
    .filter(([key]) => !skip.includes(key))
    .map(([, category]) => ({
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
      { label: definition.label, fields: fieldsOf(definition) },
    ])
  );

export type EditorSetup = {
  definitions: Record<string, BlockDefinition>;
  schemas: BlockSchemas;
  inspectorBlocks: Record<string, InspectorBlock>;
  rootFields: Record<string, FieldDef>;
  groups: BlockGroup[];
  /** Renderer components and post blocks follow this. */
  renderKind: 'page' | 'post';
};

/**
 * Blocks and settings per builder kind, matching the Puck configs: posts and
 * post templates add the post blocks; global blocks and contact forms cannot
 * hold another global block and have no page settings.
 */
export function editorSetup(kind: string): EditorSetup {
  if (kind === 'post' || kind === 'post-template') {
    return {
      definitions: postDefinitions,
      schemas: schemasOf(postDefinitions),
      inspectorBlocks: inspectorOf(postDefinitions),
      rootFields: rootFieldsFromPuck(postBuilderConfig),
      groups: groupsOf(postBuilderConfig),
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
      groups: groupsOf(builderConfig, ['global']),
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
