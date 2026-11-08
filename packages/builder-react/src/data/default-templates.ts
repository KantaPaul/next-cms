import type { BuilderDocument } from '@nextcms/builder-core';

export interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  category: 'Hero' | 'Features' | 'Pricing' | 'Testimonials' | 'FAQ' | 'CTA' | 'Custom';
  thumbnail?: string;
  content: BuilderDocument;
  createdAt?: string;
  isCustom?: boolean;
}

export const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    id: 'hero-split',
    name: 'Modern Split Hero',
    description: 'Headline, lead paragraph, dual CTA buttons, and feature badge.',
    category: 'Hero',
    content: {
      version: 1,
      root: {
        props: {
          padding: { top: 64, right: 24, bottom: 64, left: 24, unit: 'px' },
          maxWidth: '1200px',
        },
      },
      rootSlot: ['badge-1', 'headline-1', 'subheading-1', 'cta-row-1'],
      nodes: {
        'badge-1': {
          id: 'badge-1',
          type: 'Text',
          props: {
            text: '✨ New Release v2.0',
            typography: { fontSize: 13, fontWeight: 600, color: 'var(--ne-primary)' },
          },
          slots: {},
        },
        'headline-1': {
          id: 'headline-1',
          type: 'Heading',
          props: {
            text: 'Build exceptional web experiences faster',
            level: 'h1',
            typography: { fontSize: 44, fontWeight: 800, lineHeight: 1.15 },
          },
          slots: {},
        },
        'subheading-1': {
          id: 'subheading-1',
          type: 'Text',
          props: {
            text: 'A modular, high-performance editor engineered for flexibility, speed, and modern web standards.',
            typography: { fontSize: 18, color: 'var(--ne-text-muted)', lineHeight: 1.6 },
          },
          slots: {},
        },
        'cta-row-1': {
          id: 'cta-row-1',
          type: 'Columns',
          props: { gap: 12 },
          slots: {
            columns: ['cta-row-1-col-column1', 'cta-row-1-col-column2'],
          },
        },
        'cta-row-1-col-column1': {
          id: 'cta-row-1-col-column1',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: ['btn-1'] },
        },
        'cta-row-1-col-column2': {
          id: 'cta-row-1-col-column2',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: ['btn-2'] },
        },
        'btn-1': {
          id: 'btn-1',
          type: 'Button',
          props: { text: 'Get Started Free', variant: 'primary' },
          slots: {},
        },
        'btn-2': {
          id: 'btn-2',
          type: 'Button',
          props: { text: 'Live Demo', variant: 'secondary' },
          slots: {},
        },
      },
    },
  },
  {
    id: 'features-grid-3col',
    name: 'Three-Column Features',
    description: 'Grid of three feature highlights with icons and descriptions.',
    category: 'Features',
    content: {
      version: 1,
      root: {
        props: {
          padding: { top: 48, right: 24, bottom: 48, left: 24, unit: 'px' },
          maxWidth: '1200px',
        },
      },
      rootSlot: ['feat-heading', 'feat-grid'],
      nodes: {
        'feat-heading': {
          id: 'feat-heading',
          type: 'Heading',
          props: { text: 'Engineered for Performance', level: 'h2' },
          slots: {},
        },
        'feat-grid': {
          id: 'feat-grid',
          type: 'Columns',
          props: { count: 3, gap: 24 },
          slots: {
            columns: [
              'feat-grid-col-column1',
              'feat-grid-col-column2',
              'feat-grid-col-column3',
            ],
          },
        },
        'feat-grid-col-column1': {
          id: 'feat-grid-col-column1',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: ['card-1'] },
        },
        'feat-grid-col-column2': {
          id: 'feat-grid-col-column2',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: ['card-2'] },
        },
        'feat-grid-col-column3': {
          id: 'feat-grid-col-column3',
          type: 'Column',
          props: { width: 'fill' },
          slots: { content: ['card-3'] },
        },
        'card-1': {
          id: 'card-1',
          type: 'Card',
          props: {
            title: 'Ultra Lightweight',
            text: 'Sub-16 kB gzip bundle overhead for blazing fast loads.',
          },
          slots: {},
        },
        'card-2': {
          id: 'card-2',
          type: 'Card',
          props: {
            title: 'Full Keyboard Flow',
            text: 'Roving tabindex, accessible dialogs, and shortcut palette.',
          },
          slots: {},
        },
        'card-3': {
          id: 'card-3',
          type: 'Card',
          props: {
            title: 'Design Tokens First',
            text: 'Seamlessly bind to design variables with live WCAG contrast checking.',
          },
          slots: {},
        },
      },
    },
  },
  {
    id: 'pricing-table-3col',
    name: 'Tiered Pricing Table',
    description: 'Starter, Pro, and Enterprise plan comparison cards.',
    category: 'Pricing',
    content: {
      version: 1,
      root: {
        props: {
          padding: { top: 48, right: 24, bottom: 48, left: 24, unit: 'px' },
        },
      },
      rootSlot: ['price-title', 'price-cards'],
      nodes: {
        'price-title': {
          id: 'price-title',
          type: 'Heading',
          props: { text: 'Simple, transparent pricing', level: 'h2' },
          slots: {},
        },
        'price-cards': {
          id: 'price-cards',
          type: 'Columns',
          props: { count: 3, gap: 24 },
          slots: {
            content: ['plan-starter', 'plan-pro', 'plan-enterprise'],
          },
        },
        'plan-starter': {
          id: 'plan-starter',
          type: 'Card',
          props: { title: 'Starter', text: '$0 / mo - Perfect for personal experiments.' },
          slots: {},
        },
        'plan-pro': {
          id: 'plan-pro',
          type: 'Card',
          props: { title: 'Pro', text: '$29 / mo - Everything you need to scale production.' },
          slots: {},
        },
        'plan-enterprise': {
          id: 'plan-enterprise',
          type: 'Card',
          props: { title: 'Enterprise', text: 'Custom - Dedicated support, SLAs, and security.' },
          slots: {},
        },
      },
    },
  },
  {
    id: 'cta-banner',
    name: 'Call to Action Banner',
    description: 'High-conversion banner with bold headline and action trigger.',
    category: 'CTA',
    content: {
      version: 1,
      root: {
        props: {
          padding: { top: 40, right: 32, bottom: 40, left: 32, unit: 'px' },
          background: { type: 'color', color: 'var(--ne-primary-soft, #e0e7ff)' },
          border: { radius: 12 },
        },
      },
      rootSlot: ['cta-title', 'cta-btn'],
      nodes: {
        'cta-title': {
          id: 'cta-title',
          type: 'Heading',
          props: { text: 'Ready to modernize your content workflow?', level: 'h3' },
          slots: {},
        },
        'cta-btn': {
          id: 'cta-btn',
          type: 'Button',
          props: { text: 'Start your free trial', variant: 'primary' },
          slots: {},
        },
      },
    },
  },
];
