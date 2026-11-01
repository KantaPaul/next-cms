/**
 * CMS field helpers and shared schemas for block definitions. Custom fields
 * reuse the CMS controls, which read editor state through the editor bridge,
 * so they work in both editors.
 */

import type { FieldDef, Fields } from '@nextcms/builder-core';
import { z } from 'zod';
import type { SectionSettings } from '../blocks/section';
import {
  ElementPart,
  ElementStyleControl,
} from '../controls/element-style';
import {
  AttributesSectionControl,
  BackgroundSectionControl,
  BorderSectionControl,
  DisplaySectionControl,
  FilterSectionControl,
  LayoutSectionControl,
  MotionSectionControl,
  ResponsiveSectionControl,
  SectionField,
  TypographySectionControl,
} from '../controls/section-inspector';
import { IconPickerField, MediaUrlField, UrlField } from '../fields/client-fields';
import type { UrlValue } from '../style';

export const CONTENT = 'Content';
export const STYLE = 'Style & layout';

export const urlField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  tab: 'content',
  render: UrlField,
});

export const mediaField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  tab: 'content',
  render: MediaUrlField,
});

export const iconField = (label: string): FieldDef => ({
  type: 'custom',
  label,
  group: CONTENT,
  tab: 'content',
  render: IconPickerField,
});

/** Style, layout, and motion settings on every block. */
export const sectionField: FieldDef = {
  type: 'custom',
  label: 'Section',
  group: STYLE,
  render: SectionField,
};

/** Split section controls into explicit Style & Advanced tabs and sections. */
export function sectionControls(opts?: { omit?: string[] }): Fields {
  return {
    section_background: {
      type: 'custom',
      label: 'Background',
      tab: 'style',
      section: 'Background',
      path: 'section',
      render: BackgroundSectionControl,
    },
    section_border: {
      type: 'custom',
      label: 'Border & Shadow',
      tab: 'style',
      section: 'Border',
      path: 'section',
      render: BorderSectionControl,
    },
    section_typography: {
      type: 'custom',
      label: 'Typography',
      tab: 'style',
      section: 'Typography',
      path: 'section',
      render: TypographySectionControl,
    },
    section_filter: {
      type: 'custom',
      label: 'CSS Filters',
      tab: 'style',
      section: 'Filters',
      path: 'section.filter',
      render: FilterSectionControl,
    },
    section_display: {
      type: 'custom',
      label: 'Height & Alignment',
      tab: 'style',
      section: 'Display',
      path: 'section.display',
      render: DisplaySectionControl,
    },
    section_layout: {
      type: 'custom',
      label: 'Layout & Spacing',
      tab: 'advanced',
      section: 'Layout',
      path: 'section',
      render: (props: any) =>
        LayoutSectionControl({ ...props, omit: opts?.omit }),
    },
    section_animation: {
      type: 'custom',
      label: 'Motion Effects',
      tab: 'advanced',
      section: 'Motion Effects',
      path: 'section.animation',
      render: MotionSectionControl,
    },
    section_responsive: {
      type: 'custom',
      label: 'Responsive Visibility',
      tab: 'advanced',
      section: 'Responsive',
      path: 'section',
      render: ResponsiveSectionControl,
    },
    section_attributes: {
      type: 'custom',
      label: 'Anchor',
      tab: 'advanced',
      section: 'Attributes',
      path: 'section.anchor',
      render: AttributesSectionControl,
    },
  };
}

export const TEXT_PARTS: readonly ElementPart[] = [
  'color',
  'typography',
  'textShadow',
  'margin',
] as const;

export const BUTTON_PARTS: readonly ElementPart[] = [
  'color',
  'typography',
  'background',
  'border',
  'shadow',
  'padding',
  'margin',
] as const;

export const MEDIA_PARTS: readonly ElementPart[] = [
  'border',
  'shadow',
  'margin',
] as const;

/** Creates a field definition for styling an inner block element. */
export function elementStyle(
  key: string,
  label: string,
  parts: readonly ElementPart[]
): FieldDef {
  return {
    type: 'custom',
    label,
    tab: 'style',
    section: label,
    path: `elements.${key}`,
    render: (props: any) =>
      ElementStyleControl({
        parts,
        value: props.value,
        onChange: props.onChange,
      }),
  };
}

export const ALIGN_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Left', value: 'left' },
];

export {
  sectionSettingsSchema as sectionSchema,
  urlValueSchema as urlSchema,
} from '../schemas/style.schema';
