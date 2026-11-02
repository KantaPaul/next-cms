/**
 * Example first-party component registrations using the typed React component bridge
 * (RFB-03, RFB-06, RFB-22).
 *
 * Demonstrates wrapping existing project components (shadcn/ui primitives)
 * with zero duplicate rendering code, strictly validated schemas, and editor presets.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { defineReactComponent, slot } from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { z } from 'zod';

/* ---------- UiBadge ---------- */

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
  component: ({ text, variant }) => <Badge variant={variant}>{text}</Badge>,
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  ),
});
