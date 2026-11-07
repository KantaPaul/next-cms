/**
 * CMS field helpers and shared schemas for block definitions. Custom fields
 * reuse the CMS controls, which read editor state through the editor bridge,
 * so they work in both editors.
 */

import type { FieldDef, Fields } from '@nextcms/builder-core';
import { createElement } from 'react';
import { z } from 'zod';
import type { SectionSettings } from '../blocks/section';
import {
  type ElementPart,
  ElementStyleControl,
} from '../controls/element-style';
import { ColorPicker } from '../controls/color-picker';
import {
  GROUP_CONTROLS,
  type GroupKind,
  GroupShell,
} from '../controls/groups';
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

export interface GroupControlOptions<T = any> {
  label: string;
  path?: string;
  exclude?: string[];
  defaults?: Partial<T>;
  popover?: boolean;
  states?: ('normal' | 'hover')[];
  tab?: string;
  section?: string;
  hideHeader?: boolean;
}

function renderGroupShell(
  opts: GroupControlOptions<any>,
  value: any,
  onChange: (val: any) => void,
  Component: any
) {
  return createElement(GroupShell as any, {
    label: opts.label,
    value,
    onChange,
    exclude: opts.exclude,
    defaults: opts.defaults,
    popover: opts.popover,
    states: opts.states,
    hideHeader: opts.hideHeader ?? true,
    children: ({ value: childVal, onChange: childOnChange, exclude, state }: any) =>
      createElement(Component, {
        value: childVal,
        onChange: childOnChange,
        exclude,
        state,
      }),
  });
}

/**
 * Creates an Elementor-style group control field (typography, textStroke, textShadow,
 * boxShadow, border, background, imageSize, cssFilter).
 */
export function groupControl<T = any>(
  kind: GroupKind,
  opts: GroupControlOptions<T>
): FieldDef {
  const Component = GROUP_CONTROLS[kind];

  return {
    type: 'custom',
    label: opts.label,
    tab: opts.tab ?? 'style',
    section: opts.section ?? opts.label,
    path: opts.path,
    groupKind: kind,
    exclude: opts.exclude,
    defaults: opts.defaults,
    popover: opts.popover,
    states: opts.states,
    hideHeader: opts.hideHeader,
    render: (props: any) => {
      const isSectionContainer =
        opts.path === 'section' ||
        (props.value &&
          typeof props.value === 'object' &&
          ('paddingY' in props.value ||
            'background' in props.value ||
            ('fill' in props.value && kind === 'background') ||
            ('border' in props.value && kind === 'border') ||
            ('typography' in props.value && kind === 'typography') ||
            ('filter' in props.value && kind === 'cssFilter') ||
            ('shadow' in props.value && kind === 'boxShadow')));

      if (isSectionContainer) {
        const s =
          props.value && typeof props.value === 'object' ? props.value : {};
        const setSection = props.onChange;

        if (kind === 'background') {
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? { normal: s.fill, hover: s.hover?.fill }
              : s.fill,
            val => {
              if (
                opts.states?.includes('hover') &&
                val &&
                typeof val === 'object' &&
                ('normal' in val || 'hover' in val)
              ) {
                setSection({
                  ...s,
                  fill: (val as any).normal,
                  hover: { ...(s.hover ?? {}), fill: (val as any).hover },
                });
              } else {
                setSection({ ...s, fill: val });
              }
            },
            Component
          );
        }

        if (kind === 'border') {
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? {
                  normal: s.border,
                  hover: s.hover?.borderColor
                    ? { color: s.hover.borderColor }
                    : undefined,
                }
              : s.border,
            val => {
              if (
                opts.states?.includes('hover') &&
                val &&
                typeof val === 'object' &&
                ('normal' in val || 'hover' in val)
              ) {
                setSection({
                  ...s,
                  border: (val as any).normal,
                  hover: {
                    ...(s.hover ?? {}),
                    borderColor: (val as any).hover?.color,
                  },
                });
              } else {
                setSection({ ...s, border: val });
              }
            },
            Component
          );
        }

        if (kind === 'typography') {
          return renderGroupShell(
            opts,
            s.typography,
            typography => setSection({ ...s, typography }),
            Component
          );
        }

        if (kind === 'cssFilter') {
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? { normal: s.filter, hover: s.hover?.filter }
              : s.filter,
            val => {
              if (
                opts.states?.includes('hover') &&
                val &&
                typeof val === 'object' &&
                ('normal' in val || 'hover' in val)
              ) {
                setSection({
                  ...s,
                  filter: (val as any).normal,
                  hover: { ...(s.hover ?? {}), filter: (val as any).hover },
                });
              } else {
                setSection({ ...s, filter: val });
              }
            },
            Component
          );
        }

        if (kind === 'boxShadow') {
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? { normal: s.shadow, hover: s.hover?.shadow }
              : s.shadow,
            val => {
              if (
                opts.states?.includes('hover') &&
                val &&
                typeof val === 'object' &&
                ('normal' in val || 'hover' in val)
              ) {
                setSection({
                  ...s,
                  shadow: (val as any).normal,
                  hover: { ...(s.hover ?? {}), shadow: (val as any).hover },
                });
              } else {
                setSection({ ...s, shadow: val });
              }
            },
            Component
          );
        }
      }

      return renderGroupShell(opts, props.value, props.onChange, Component);
    },
  };
}

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
    section_background: groupControl('background', {
      label: 'Background',
      tab: 'style',
      section: 'Background',
      path: 'section',
      states: ['normal', 'hover'],
    }),
    section_border: groupControl('border', {
      label: 'Border',
      tab: 'style',
      section: 'Border',
      path: 'section',
      states: ['normal', 'hover'],
    }),
    section_shadow: groupControl('boxShadow', {
      label: 'Box Shadow',
      tab: 'style',
      section: 'Border',
      path: 'section',
      states: ['normal', 'hover'],
    }),
    section_typography: groupControl('typography', {
      label: 'Typography',
      tab: 'style',
      section: 'Typography',
      path: 'section',
    }),
    section_text_color: {
      type: 'custom',
      label: 'Text color',
      tab: 'style',
      section: 'Typography',
      path: 'section.textColor',
      render: (props: any) =>
        createElement(ColorPicker, {
          label: 'Text color',
          value: props.value,
          onChange: props.onChange,
        }),
    },
    section_filter: groupControl('cssFilter', {
      label: 'CSS Filters',
      tab: 'style',
      section: 'Filters',
      path: 'section',
      states: ['normal', 'hover'],
    }),
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
  'textStroke',
  'textShadow',
  'margin',
] as const;

export const BUTTON_PARTS: readonly ElementPart[] = [
  'color',
  'typography',
  'textShadow',
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
  'imageSize',
  'cssFilter',
] as const;

export const ALL_PARTS: readonly ElementPart[] = [
  'color',
  'typography',
  'textStroke',
  'textShadow',
  'background',
  'border',
  'shadow',
  'padding',
  'margin',
  'cssFilter',
  'imageSize',
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
