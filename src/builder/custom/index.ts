/**
 * Custom blocks registry and exports.
 *
 * Developers register their project React components here.
 * Components defined with `defineReactComponent` or `defineBlock` are exported
 * and automatically wired into the CMS editor and renderer.
 */

import type { BlockDefinition } from '@nextcms/builder-core';
import type { ComponentType } from 'react';
import {
  pluginBlockDefinitions,
  pluginComponents,
} from '@/plugins/client-blocks';
import { Example } from './example';
import { UiBadgeBlock, UiCardBlock } from './ui-blocks';

export const customBlockDefinitions: BlockDefinition[] = [
  UiBadgeBlock,
  UiCardBlock,
  ...pluginBlockDefinitions,
];

export const customComponents: Record<
  string,
  ComponentType<Record<string, unknown>>
> = {
  example: Example,
  UiBadge: UiBadgeBlock.render as ComponentType<Record<string, unknown>>,
  UiCard: UiCardBlock.render as ComponentType<Record<string, unknown>>,
  ...pluginComponents,
};
