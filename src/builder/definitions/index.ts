/**
 * Every page block for the new editor: native definitions first, the rest
 * from the Puck config, with the derived editor schemas, inspector fields,
 * and insert groups.
 */

import { type BlockDefinition, type BlockSchemas, fieldsOf, toBlockSchema } from '@nextcms/builder-core';
import type { BlockGroup, InspectorBlock } from '@nextcms/builder-react';
import { builderConfig } from '../config';
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
