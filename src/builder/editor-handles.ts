/**
 * CMS resize handles (R695) and inline-editable props (R696) for the new
 * editor. Handles write the same section settings the inspector edits, per
 * device, so dragging and the Dimensions controls stay in step.
 */

import {
  type BuilderDocument,
  type BuilderNode,
  type Device,
  findPosition,
  type NodeId,
  resetDeviceValue,
  slotChildren,
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

const parseColumnPercent = (
  widthProp: unknown,
  device: Device
): number | undefined => {
  const val = valueForDevice(widthProp as any, device);
  if (typeof val !== 'string') return undefined;
  const match = val.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return match ? Number.parseFloat(match[1]) : undefined;
};

/**
 * Column width handle on the right edge of each Column except the last.
 * Dragging changes the column and its right-hand neighbour in %, keeping the
 * row's total width constant, snapping to 5% with a minimum of 5% of the row.
 */
export const columnWidth: ResizeHandle = {
  id: 'columnWidth',
  label: 'Column width',
  edge: 'right',
  unit: '%',
  min: 5,
  max: 95,
  step: 5,
  snap: [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  ],
  read: (props, device) => parseColumnPercent(props.width, device),
  write: (props, device, value) => {
    if (value === undefined) {
      const next = resetDeviceValue(props.width as any, device);
      return { width: next ?? 'fill' };
    }
    const clamped = Math.min(95, Math.max(5, Math.round(value / 5) * 5));
    return {
      width: withDeviceValue(props.width as any, device, `${clamped}%`),
    };
  },
  writeNodes: ({
    id,
    baseDoc,
    device,
    measuredWidths,
    deltaPx,
    stepDelta,
    reset,
    altKey,
  }) => {
    const pos = findPosition(baseDoc, id);
    const visibleCols = pos
      ? slotChildren(baseDoc, pos).filter(
          cid => baseDoc.nodes[cid] && !baseDoc.nodes[cid].meta?.hidden
        )
      : [id];
    const idx = visibleCols.indexOf(id);
    const rightId =
      idx >= 0 && idx < visibleCols.length - 1
        ? visibleCols[idx + 1]
        : undefined;
    const leftNode = baseDoc.nodes[id];
    const rightNode = rightId ? baseDoc.nodes[rightId] : undefined;
    if (!leftNode) return { patches: {} };

    if (reset) {
      const patches: Record<NodeId, Record<string, unknown>> = {
        [id]: {
          width: resetDeviceValue(leftNode.props.width as any, device) ?? 'fill',
        },
      };
      if (rightId && rightNode) {
        patches[rightId] = {
          width:
            resetDeviceValue(rightNode.props.width as any, device) ?? 'fill',
        };
      }
      return { patches };
    }

    const totalRowWidthPx = visibleCols.reduce(
      (sum, cid) => sum + (measuredWidths[cid] ?? 0),
      0
    );
    const leftPctProp = parseColumnPercent(leftNode.props.width, device);
    const rightPctProp = rightNode
      ? parseColumnPercent(rightNode.props.width, device)
      : undefined;

    let startLeftPct: number;
    let startRightPct: number;
    if (leftPctProp !== undefined && rightPctProp !== undefined) {
      startLeftPct = leftPctProp;
      startRightPct = rightPctProp;
    } else if (totalRowWidthPx > 0 && measuredWidths[id]) {
      startLeftPct = (measuredWidths[id] / totalRowWidthPx) * 100;
      startRightPct =
        rightId && measuredWidths[rightId]
          ? (measuredWidths[rightId] / totalRowWidthPx) * 100
          : Math.max(5, 100 - startLeftPct);
    } else {
      const fallbackShare = 100 / Math.max(1, visibleCols.length);
      startLeftPct = leftPctProp ?? fallbackShare;
      startRightPct = rightPctProp ?? fallbackShare;
    }

    const combinedPct =
      visibleCols.length === 2
        ? 100
        : Math.round((startLeftPct + startRightPct) * 100) / 100;

    const rawLeft =
      stepDelta !== undefined
        ? startLeftPct + stepDelta
        : startLeftPct + ((deltaPx ?? 0) / (totalRowWidthPx || 100)) * 100;

    const snappedLeft = altKey
      ? Math.round(rawLeft)
      : Math.round(rawLeft / 5) * 5;
    const maxLeft = Math.max(5, combinedPct - 5);
    const nextLeft = Math.min(maxLeft, Math.max(5, snappedLeft));
    const nextRight = Math.max(
      5,
      Math.round((combinedPct - nextLeft) * 100) / 100
    );

    const patches: Record<NodeId, Record<string, unknown>> = {
      [id]: {
        width: withDeviceValue(
          leftNode.props.width as any,
          device,
          `${nextLeft}%`
        ),
      },
    };
    if (rightId && rightNode) {
      patches[rightId] = {
        width: withDeviceValue(
          rightNode.props.width as any,
          device,
          `${nextRight}%`
        ),
      };
    }
    return {
      patches,
      value: nextLeft,
      snapped: !altKey && nextLeft % 5 === 0,
    };
  },
  fallback: ({ width, parentWidth }) =>
    Math.round((width / (parentWidth || 1)) * 100),
};

/** Blocks whose definition has section settings, even when stored without them. */
const hasSection = (type: string) => {
  const fields = pageDefinitions[type]?.fields;
  if (!fields) return false;
  return 'section' in fields || 'section_background' in fields || 'section_layout' in fields;
};

export function cmsResizeHandles(
  node: BuilderNode,
  doc?: BuilderDocument
): ResizeHandle[] {
  if (node.type === 'Spacer') return [spacerHeight, sectionWidth];
  if (node.type === 'Column') {
    if (doc) {
      const pos = findPosition(doc, node.id);
      const visibleCols = pos
        ? slotChildren(doc, pos).filter(
            cid => doc.nodes[cid] && !doc.nodes[cid].meta?.hidden
          )
        : [];
      const idx = visibleCols.indexOf(node.id);
      const isLast = idx === -1 || idx === visibleCols.length - 1;
      return isLast
        ? [sectionTop, sectionBottom]
        : [columnWidth, sectionTop, sectionBottom];
    }
    return [columnWidth, sectionTop, sectionBottom];
  }
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
