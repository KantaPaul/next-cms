/**
 * CMS resize handles (R695) and inline-editable props (R696) for the new
 * editor. Handles write the same section settings the inspector edits, per
 * device, so dragging and the Dimensions controls stay in step.
 */

import {
  type BuilderNode,
  type Device,
  resetDeviceValue,
  valueForDevice,
  withDeviceValue,
} from '@nextcms/builder-core';
import type { ResizeHandle } from '@nextcms/builder-react';
import type { SectionSettings } from './blocks/section';
import { pageDefinitions } from './definitions';
import { SPACING_LIMITS, type Sides } from './style';

const sectionOf = (props: Record<string, unknown>) =>
  (props.section ?? {}) as SectionSettings;

/** Section width in %, the style system's default width unit. */
const sectionWidth: ResizeHandle = {
  id: 'section-width',
  label: 'Width',
  edge: 'right',
  unit: '%',
  min: 10,
  max: 100,
  step: 1,
  snap: [25, 33.33, 50, 66.67, 75, 100],
  read: (props, device) => {
    const section = sectionOf(props);
    if (section.widthUnit && section.widthUnit !== '%') return undefined;
    return valueForDevice(section.width, device);
  },
  write: (props, device, value) => {
    const section = sectionOf(props);
    const nextWidth =
      value === undefined
        ? resetDeviceValue(section.width, device)
        : withDeviceValue(section.width, device, value);
    return {
      section: {
        ...section,
        widthUnit: '%',
        width: nextWidth,
      },
    };
  },
  fallback: ({ width, parentWidth }) => Math.round((width / parentWidth) * 100),
};

/** Top padding in px. Spacing applies only with a desktop value, so other devices pin desktop first. */
const sectionTop: ResizeHandle = {
  id: 'section-top',
  label: 'Top spacing',
  edge: 'top',
  unit: 'px',
  min: 0,
  max: SPACING_LIMITS.px.max,
  step: 2,
  snap: [0, 8, 16, 24, 32, 48, 64, 80, 96, 120, 160],
  read: (props, device) => {
    const section = sectionOf(props);
    if (section.spacingUnit && section.spacingUnit !== 'px') return undefined;
    return valueForDevice(section.spacing, device)?.top;
  },
  write: (props, device, value, { start }) => {
    const section = sectionOf(props);
    const spacing = { ...section.spacing };
    if (value === undefined) {
      if (spacing[device]) {
        const sides = { ...spacing[device] };
        delete sides.top;
        if (Object.keys(sides).length) spacing[device] = sides;
        else delete spacing[device];
      }
      return { section: { ...section, spacing } };
    }
    if (device !== 'desktop' && spacing.desktop?.top === undefined) {
      spacing.desktop = { ...spacing.desktop, top: start };
    }
    const sides: Sides = {
      ...valueForDevice(section.spacing, device),
      ...spacing[device],
      top: value,
    };
    return {
      section: {
        ...section,
        spacingUnit: 'px',
        spacing: { ...spacing, [device]: sides },
      },
    };
  },
  fallback: ({ element }) => {
    const view = element?.ownerDocument.defaultView;
    return element && view
      ? Number.parseFloat(view.getComputedStyle(element).paddingTop) || 0
      : 0;
  },
};

/** Bottom padding in px. Spacing applies only with a desktop value, so other devices pin desktop first. */
const sectionBottom: ResizeHandle = {
  id: 'section-bottom',
  label: 'Bottom spacing',
  edge: 'bottom',
  unit: 'px',
  min: 0,
  max: SPACING_LIMITS.px.max,
  step: 2,
  snap: [0, 8, 16, 24, 32, 48, 64, 80, 96, 120, 160],
  read: (props, device) => {
    const section = sectionOf(props);
    if (section.spacingUnit && section.spacingUnit !== 'px') return undefined;
    return valueForDevice(section.spacing, device)?.bottom;
  },
  write: (props, device, value, { start }) => {
    const section = sectionOf(props);
    const spacing = { ...section.spacing };
    if (value === undefined) {
      if (spacing[device]) {
        const sides = { ...spacing[device] };
        delete sides.bottom;
        if (Object.keys(sides).length) spacing[device] = sides;
        else delete spacing[device];
      }
      return { section: { ...section, spacing } };
    }
    if (device !== 'desktop' && spacing.desktop?.bottom === undefined) {
      spacing.desktop = { ...spacing.desktop, bottom: start };
    }
    const sides: Sides = {
      ...valueForDevice(section.spacing, device),
      ...spacing[device],
      bottom: value,
    };
    return {
      section: {
        ...section,
        spacingUnit: 'px',
        spacing: { ...spacing, [device]: sides },
      },
    };
  },
  fallback: ({ element }) => {
    const view = element?.ownerDocument.defaultView;
    return element && view
      ? Number.parseFloat(view.getComputedStyle(element).paddingBottom) || 0
      : 0;
  },
};

const spacerHeight: ResizeHandle = {
  id: 'spacer-height',
  label: 'Height',
  edge: 'bottom',
  unit: 'px',
  min: 0,
  max: 400,
  step: 4,
  read: props => (typeof props.height === 'number' ? props.height : undefined),
  write: (_props, _device: Device, value) => ({ height: value }),
};

/** Blocks whose definition has section settings, even when stored without them. */
const hasSection = (type: string) => {
  const fields = pageDefinitions[type]?.fields;
  if (!fields) return false;
  return 'section' in fields || 'section_background' in fields || 'section_layout' in fields;
};

export function cmsResizeHandles(node: BuilderNode): ResizeHandle[] {
  if (node.type === 'Spacer') return [spacerHeight, sectionWidth];
  return hasSection(node.type) ? [sectionWidth, sectionTop, sectionBottom] : [];
}

/** Text props editable on the canvas: declared inline props, else every plain text field. */
export function cmsInlineProps(type: string): string[] | undefined {
  const definition = pageDefinitions[type];
  if (!definition) return undefined;
  if (definition.inlineProps) return definition.inlineProps;
  return Object.entries(definition.fields ?? {})
    .filter(([, field]) => field?.type === 'text' || field?.type === 'textarea')
    .map(([name]) => name);
}
