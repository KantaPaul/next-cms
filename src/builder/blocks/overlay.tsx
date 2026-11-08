'use client';

import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

/* =========================================================================
   OverlayClose Block
   ========================================================================= */

export type OverlayCloseProps = WithSection & {
  label?: string;
  variant?: 'button' | 'link' | 'icon';
  buttonStyle?: 'primary' | 'secondary' | 'outline' | 'soft' | 'ghost';
  alignment?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
};

const CLOSE_BTN_SIZE = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/** Site button classes (follow the public theme, not the admin's dark/light tokens). */
const CLOSE_STYLE_CLASS = {
  primary: 's-btn s-btn-primary',
  secondary: 's-btn s-btn-secondary',
  outline: 's-btn s-btn-outline',
  soft: 's-btn s-btn-soft',
  ghost: 's-btn s-btn-ghost',
};

export function OverlayClose(p: OverlayCloseProps) {
  const customEl = el(p, 'close');
  const variant = p.variant ?? 'link';
  const label = p.label || (variant === 'link' ? 'No thanks' : 'Close');

  return (
    <Section section={p.section} editing={p.editing}>
      <div
        className={cn(
          'flex w-full',
          p.alignment === 'center'
            ? 'justify-center'
            : p.alignment === 'right'
              ? 'justify-end'
              : 'justify-start'
        )}
      >
        {variant === 'icon' ? (
          <button
            type="button"
            data-overlay-close="true"
            aria-label="Close overlay"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full text-current opacity-70 transition hover:bg-black/5 hover:opacity-100',
              customEl.className
            )}
            style={customEl.style}
          >
            <X className="size-4" />
          </button>
        ) : variant === 'button' ? (
          <button
            type="button"
            data-overlay-close="true"
            className={cn(
              'inline-flex items-center justify-center transition-colors',
              CLOSE_BTN_SIZE[p.size ?? 'md'],
              CLOSE_STYLE_CLASS[p.buttonStyle ?? 'outline'],
              customEl.className
            )}
            style={customEl.style}
          >
            {label}
          </button>
        ) : (
          <button
            type="button"
            data-overlay-close="true"
            className={cn(
              'text-xs text-current underline underline-offset-4 opacity-70 transition-opacity hover:opacity-100',
              customEl.className
            )}
            style={customEl.style}
          >
            {label}
          </button>
        )}
      </div>
    </Section>
  );
}

/* =========================================================================
   Heading Block (Clean typography element for overlays and pages)
   ========================================================================= */

export type HeadingProps = WithSection & {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  alignment?: 'left' | 'center' | 'right';
};

const HEADING_SIZES = {
  sm: 'text-lg font-semibold tracking-tight',
  md: 'text-xl font-semibold tracking-tight',
  lg: 'text-2xl font-bold tracking-tight',
  xl: 'text-3xl font-extrabold tracking-tight',
  '2xl': 'text-4xl font-extrabold tracking-tight',
};

export function Heading(p: HeadingProps) {
  const Tag = p.level ?? 'h2';
  const customEl = el(p, 'heading');

  return (
    <Section section={p.section} editing={p.editing}>
      <Tag
        className={cn(
          HEADING_SIZES[p.size ?? 'lg'],
          p.alignment === 'center'
            ? 'text-center'
            : p.alignment === 'right'
              ? 'text-right'
              : 'text-left',
          customEl.className
        )}
        style={customEl.style}
      >
        {p.text || 'Heading'}
      </Tag>
    </Section>
  );
}

/* =========================================================================
   Divider Block (Horizontal separator)
   ========================================================================= */

export type DividerProps = WithSection & {
  style?: 'solid' | 'dashed' | 'dotted';
  color?: string;
  thickness?: number;
  spacing?: 'sm' | 'md' | 'lg';
};

const DIVIDER_SPACING = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
};

export function Divider(p: DividerProps) {
  const thickness = p.thickness ?? 1;
  const borderStyle = p.style ?? 'solid';

  const style: CSSProperties = {
    borderTopWidth: `${thickness}px`,
    borderTopStyle: borderStyle,
    ...(p.color && { borderColor: p.color }),
  };

  return (
    <Section section={p.section} editing={p.editing}>
      <hr
        className={cn(
          'w-full border-0 border-t border-border',
          DIVIDER_SPACING[p.spacing ?? 'md']
        )}
        style={style}
      />
    </Section>
  );
}
