import { reorderParts } from '@nextcms/builder-core';
import { createElement, type CSSProperties, Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  type ElementStyle,
  resolveElementStyle,
  type SectionSettings,
} from '../style';

export type WithSection = {
  section?: SectionSettings;
  elements?: Record<string, ElementStyle>;
  partOrder?: string[];
  editing?: boolean;
};

/**
 * Renders named block parts in `reorderParts(p?.partOrder, Object.keys(parts))` order.
 * When `p?.editing` is true, wraps each rendered part in `<div data-part={id} style={{ display: 'contents' }}>`
 * so the canvas overlay can find and measure it; published HTML stays unchanged.
 */
export function orderedParts(
  p: { partOrder?: string[]; editing?: boolean } | undefined,
  parts: Record<string, ReactNode>
): ReactNode[] {
  const order = reorderParts(p?.partOrder, Object.keys(parts));
  const result: ReactNode[] = [];
  for (const id of order) {
    const node = parts[id];
    if (node === null || node === undefined || node === false) continue;
    if (p?.editing) {
      result.push(
        createElement(
          'div',
          { key: id, 'data-part': id, style: { display: 'contents' } },
          node
        )
      );
    } else {
      result.push(createElement(Fragment, { key: id }, node));
    }
  }
  return result;
}

/**
 * Resolves classes and inline styles for a named child element in a block
 * (e.g., `el(props, 'title', 'text-4xl font-extrabold')`).
 */
export function el(
  props: WithSection | undefined,
  key: string,
  baseClass?: string
): { className: string; style: CSSProperties } {
  const elementStyle = props?.elements?.[key];
  if (!elementStyle) {
    return {
      className: baseClass ?? '',
      style: {},
    };
  }

  const resolved = resolveElementStyle(elementStyle);
  return {
    className: cn(baseClass, ...resolved.classes),
    style: resolved.style,
  };
}
