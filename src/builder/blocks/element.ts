import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  type ElementStyle,
  resolveElementStyle,
  type SectionSettings,
} from '../style';

export type WithSection = {
  section?: SectionSettings;
  elements?: Record<string, ElementStyle>;
  editing?: boolean;
};

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
