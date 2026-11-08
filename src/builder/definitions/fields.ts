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
import { GROUP_CONTROLS, type GroupKind, GroupShell } from '../controls/groups';
import {
  AttributesSectionControl,
  BackgroundSectionControl,
  BorderSectionControl,
  DisplaySectionControl,
  EffectsSectionControl,
  FilterSectionControl,
  LayoutSectionControl,
  MotionSectionControl,
  ResponsiveSectionControl,
  SectionField,
  TypographySectionControl,
} from '../controls/section-inspector';
import {
  IconPickerField,
  MediaUrlField,
  UrlField,
} from '../fields/client-fields';
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
    children: ({
      value: childVal,
      onChange: childOnChange,
      exclude,
      state,
    }: any) =>
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
            ('filter' in props.value && kind === 'cssFilter')));

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

        if (kind === 'boxShadow') {
          // Only structured shadows are editable; legacy preset strings show as unset.
          const normal =
            s.shadow && typeof s.shadow === 'object' ? s.shadow : undefined;
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? { normal, hover: s.hover?.shadow }
              : normal,
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

        if (kind === 'typography') {
          return renderGroupShell(
            opts,
            s.typography,
            typography => setSection({ ...s, typography }),
            Component
          );
        }

        if (kind === 'cssFilter') {
          // Older saves nested `{ normal, hover }` under `section.filter`.
          const legacy =
            s.filter && typeof s.filter === 'object' && 'normal' in s.filter
              ? (s.filter as { normal?: unknown; hover?: unknown })
              : undefined;
          const normalFilter = legacy ? legacy.normal : s.filter;
          const hoverFilter = s.hover?.filter ?? legacy?.hover;
          return renderGroupShell(
            opts,
            opts.states?.includes('hover')
              ? { normal: normalFilter, hover: hoverFilter }
              : normalFilter,
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
    section_effects: {
      type: 'custom',
      label: 'Glass & Hover',
      tab: 'style',
      section: 'Effects',
      path: 'section',
      render: EffectsSectionControl,
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

/** Parts for boxed form elements (input, status message): no text effects. */
export const FIELD_PARTS: readonly ElementPart[] = [
  'color',
  'typography',
  'background',
  'border',
  'padding',
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

/**
 * Style controls for the shared section heading (eyebrow pill, title, subtitle)
 * rendered by `SectionHeading`. Keys match `HEADING_ELEMENTS` in blocks/section.tsx.
 */
export function headingStyles(opts?: {
  eyebrow?: boolean;
  subtitle?: boolean;
}): Fields {
  const fields: Fields = {};
  if (opts?.eyebrow !== false)
    fields.heading_eyebrow_style = elementStyle(
      'headingEyebrow',
      'Eyebrow Style',
      BUTTON_PARTS
    );
  fields.heading_title_style = elementStyle(
    'headingTitle',
    'Heading Style',
    TEXT_PARTS
  );
  if (opts?.subtitle !== false)
    fields.heading_subtitle_style = elementStyle(
      'headingSubtitle',
      'Subheading Style',
      TEXT_PARTS
    );
  return fields;
}

/** Card look for card-based blocks. Read by `cardClass()` in blocks/section.tsx. */
export function cardFields(): Fields {
  return {
    cardVariant: {
      label: 'Card style',
      type: 'select',
      tab: 'style',
      section: 'Cards',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Flat (filled)', value: 'flat' },
        { label: 'Outline (hairline)', value: 'outline' },
        { label: 'Elevated (shadow)', value: 'elevated' },
        { label: 'Glass (blurred)', value: 'glass' },
        { label: 'None (no box)', value: 'none' },
      ],
    },
    cardHover: {
      label: 'Lift cards on hover',
      type: 'toggle',
      tab: 'style',
      section: 'Cards',
    },
  } as Fields;
}

/** Grid column count for blocks whose item grid used to be fixed. */
export function columnsField(
  label = 'Columns',
  values: number[] = [1, 2, 3, 4]
): FieldDef {
  return {
    label,
    group: CONTENT,
    type: 'select',
    options: values.map(v => ({ label: String(v), value: v })),
  } as FieldDef;
}

/** Creates a field definition for styling an inner block element. */
export function elementStyle(
  key: string,
  label: string,
  parts: readonly ElementPart[],
  opts?: { when?: (props: any) => boolean }
): FieldDef {
  return {
    type: 'custom',
    label,
    tab: 'style',
    section: label,
    path: `elements.${key}`,
    when: opts?.when,
    render: (props: any) =>
      ElementStyleControl({
        parts,
        value: props.value,
        onChange: props.onChange,
      }),
  };
}

/**
 * Section controls for content blocks: drops block-wide typography and text
 * color (each element has its own style controls), and optionally display
 * (height/alignment, which only matters for full-band blocks).
 */
export function contentSectionControls(opts?: {
  keepDisplay?: boolean;
}): Fields {
  const {
    section_typography: _typography,
    section_text_color: _textColor,
    section_display: _display,
    ...rest
  } = sectionControls();
  if (opts?.keepDisplay && _display) {
    return {
      ...rest,
      section_display: _display,
    };
  }
  return rest;
}

/**
 * Sends a block's ungrouped settings to the Content tab. Without a group the
 * inspector files anything but plain text under Style > General, so links and
 * toggles end up among the styles. Names in `appearance`, and fields already on
 * the Style tab without a section, are purely visual and go to Style > Appearance.
 */
export function contentFields(
  fields: Fields,
  opts?: { appearance?: string[] }
): Fields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      if (field?.tab === 'style' && !field.section) {
        return [key, { ...field, section: 'Appearance' }];
      }
      if (!field || field.tab || field.section || field.group)
        return [key, field];
      return [
        key,
        opts?.appearance?.includes(key)
          ? { ...field, tab: 'style', section: 'Appearance' }
          : { ...field, group: CONTENT },
      ];
    })
  ) as Fields;
}

/**
 * Card element styles for card-based blocks (BlogPosts, RelatedPosts, QueryLoop,
 * LoopGrid). `when` hides the card controls only; pagination is independent of
 * the card, so it stays visible.
 */
export function cardStyles(opts?: { when?: (props: any) => boolean }): Fields {
  return {
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS, opts),
    card_image_style: elementStyle(
      'cardImage',
      'Card Image Style',
      MEDIA_PARTS,
      opts
    ),
    card_category_style: elementStyle(
      'cardCategory',
      'Category Style',
      TEXT_PARTS,
      opts
    ),
    card_title_style: elementStyle(
      'cardTitle',
      'Card Title Style',
      TEXT_PARTS,
      opts
    ),
    card_excerpt_style: elementStyle(
      'cardExcerpt',
      'Excerpt Style',
      TEXT_PARTS,
      opts
    ),
    card_meta_style: elementStyle('cardMeta', 'Meta Style', TEXT_PARTS, opts),
    pagination_style: elementStyle(
      'pagination',
      'Pagination Style',
      BUTTON_PARTS
    ),
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
