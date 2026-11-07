/**
 * First-party component registrations using the typed React component bridge
 * (RFB-03, RFB-06, RFB-22) wired to site tokens (Quiet Editorial).
 */

import { defineReactComponent, slot } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils/cn';

/* ---------- UiBadge ---------- */

const BADGE_VARIANTS = {
  default: 's-primary-bg border border-transparent shadow-subtle',
  secondary: 's-surface s-border text-[var(--site-fg)] border',
  destructive:
    'bg-rose-900/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30',
  outline: 'bg-transparent s-border text-[var(--site-fg)] border',
};

export const UiBadgeBlock = defineReactComponent<{
  text: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}>({
  name: 'UiBadge',
  label: 'Badge',
  category: 'UI',
  keywords: ['badge', 'chip', 'tag', 'status'],
  description: 'Compact status indicator or pill tag.',
  props: z.object({
    text: z.string().describe('Badge text').default('New'),
    variant: z
      .enum(['default', 'secondary', 'destructive', 'outline'])
      .describe('Visual style variant')
      .default('default'),
  }),
  variants: {
    highlight: {
      label: 'Secondary Highlight',
      props: { variant: 'secondary', text: 'Popular' },
    },
    danger: {
      label: 'Destructive Warning',
      props: { variant: 'destructive', text: 'Urgent' },
    },
    minimal: {
      label: 'Outline Minimal',
      props: { variant: 'outline', text: 'Beta' },
    },
  },
  component: ({ text, variant = 'default' }) => (
    <span
      className={cn(
        'inline-flex items-center px-3 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider select-none transition-colors',
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.default
      )}
    >
      {text}
    </span>
  ),
});

/* ---------- UiCard ---------- */

export const UiCardBlock = defineReactComponent<{
  title: string;
  description?: string;
  children?: ReactNode;
}>({
  name: 'UiCard',
  label: 'Card',
  category: 'UI',
  keywords: ['card', 'container', 'box', 'panel'],
  description: 'Styled content card with header, title, description, and children slot.',
  props: z.object({
    title: z.string().describe('Card heading').default('Card Title'),
    description: z.string().optional().describe('Subheading or description'),
  }),
  slots: { content: slot() },
  childrenSlot: 'content',
  variants: {
    announcement: {
      label: 'Announcement Card',
      props: {
        title: 'Important Update',
        description: 'Read the latest release notes and architectural guides.',
      },
    },
  },
  component: ({ title, description, children }) => (
    <div className="s-card s-card-outline p-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-xl font-medium text-[var(--site-fg)] leading-snug">
          {title}
        </h3>
        {description && (
          <p className="s-muted text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {children && <div className="mt-2 text-sm leading-relaxed">{children}</div>}
    </div>
  ),
});
