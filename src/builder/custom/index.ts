import type { ComponentType } from 'react';
import { createElement } from 'react';
import type { ComponentConfig, Field, Fields } from '@measured/puck';
import { DEFAULT_SECTION } from '@/builder/blocks/section';
import { SectionField } from '@/builder/controls/section-inspector';
import { Example } from './example';

/**
 * Registration type for local Puck plugins. Loaded from `src/builder/custom/`
 * without touching the Puck config again; adding a later block means adding a file
 * under that folder and one line in the `customBlocks` array below.
 */
export type CustomBlock = {
  key: string;
  label: string;
  category?: string;
  fields: Fields;
  defaultProps: Record<string, unknown>;
  render: ComponentType<Record<string, unknown>>;
};

const exampleFields: Fields = {
  heading: { type: 'text', label: 'Heading' },
  body: { type: 'textarea', label: 'Body' },
};

export const customBlocks: CustomBlock[] = [
  {
    key: 'example',
    label: 'Example',
    category: 'custom',
    fields: exampleFields,
    defaultProps: {
      heading: 'Example block',
      body: 'A local plugin renders here. Remove the example to add your own.',
      section: DEFAULT_SECTION,
    },
    render: Example,
  },
];

const renderCustom = (Block: ComponentType<Record<string, unknown>>) =>
  (props: Record<string, unknown> & { puck?: unknown }) =>
    createElement(Block as ComponentType<Record<string, any>>, {
      ...props,
      editing: Boolean((props as { editing?: boolean }).editing ?? props?.puck),
    });

/** Puck component entries for the local plugins; the loader adds the section field. */
export const customBlockEntries: Record<string, ComponentConfig> =
  customBlocks.reduce<Record<string, ComponentConfig>>(
    (entries, block) => {
      entries[block.key] = {
        label: block.label,
        fields: {
          ...block.fields,
          section: SectionField,
        } as unknown as Fields,
        defaultProps: block.defaultProps,
        render: renderCustom(block.render) as unknown as ComponentConfig['render'],
      };
      return entries;
    },
    {}
  );
