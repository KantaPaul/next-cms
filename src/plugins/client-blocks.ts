import type { BlockDefinition, FieldDef } from '@nextcms/builder-core';
import type { ComponentType } from 'react';
import { CLIENT_PLUGINS } from './generated/client-registry';

/** All builder blocks contributed by installed code plugins. */
export const pluginBlockDefinitions: BlockDefinition[] = CLIENT_PLUGINS.flatMap(
  plugin => plugin.blocks ?? []
);

/** Map of namespaced plugin block type (`pluginId/BlockName`) to its render component. */
export const pluginComponents: Record<
  string,
  ComponentType<Record<string, unknown>>
> = Object.fromEntries(
  pluginBlockDefinitions.map(block => [
    block.type,
    block.render as ComponentType<Record<string, unknown>>,
  ])
);

/** Maps each plugin block type (`pluginId/BlockName`) to its owning `pluginId`. */
export const PLUGIN_BLOCK_OWNER: Record<string, string> = Object.fromEntries(
  CLIENT_PLUGINS.flatMap(plugin =>
    (plugin.blocks ?? []).map(block => [block.type, plugin.id])
  )
);

/** Custom inspector fields registered by plugins (`fieldKey -> Component`). */
export const pluginInspectorFields: Record<string, ComponentType<any>> =
  Object.assign(
    {},
    ...CLIENT_PLUGINS.map(plugin => plugin.fields ?? {})
  );

/** Optional client-side FieldDef overrides for plugin form actions. */
export const pluginFormActionFields: Record<string, Record<string, FieldDef>> =
  Object.assign(
    {},
    ...CLIENT_PLUGINS.map(plugin => plugin.formActionFields ?? {})
  );
