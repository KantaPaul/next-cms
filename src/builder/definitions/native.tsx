/**
 * Blocks written with `defineBlock` (R697, R773). Props are inferred from each
 * schema; defaults match the Puck config, so stored pages are unchanged. The
 * remaining blocks come from the Puck config through `from-puck.ts` until
 * they are ported here.
 */

import { defineBlock } from '@nextcms/builder-core';
import { z } from 'zod';
import { Button, Spacer } from '../blocks/layout';
import { Hero } from '../blocks/marketing';
import { DEFAULT_SECTION } from '../blocks/section';
import {
  ALIGN_OPTIONS,
  CONTENT,
  mediaField,
  sectionField,
  sectionSchema,
  urlField,
  urlSchema,
} from './fields';

const alignment = z.enum(['center', 'left']);

export const HeroBlock = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'heroes',
  icon: 'hero',
  keywords: ['banner', 'header', 'headline'],
  inlineProps: ['title', 'subtitle'],
  schema: z.object({
    badge: z.string().default('New'),
    title: z.string().default('A headline that explains what you do'),
    subtitle: z.string().default('One or two sentences that describe the value for your visitors.'),
    primaryButtonText: z.string().default('Get started'),
    primaryButtonLink: urlSchema.default('#'),
    secondaryButtonText: z.string().default('Learn more'),
    secondaryButtonLink: urlSchema.default('#'),
    imageUrl: z.string().default(''),
    imageAlt: z.string().default(''),
    alignment: alignment.default('center'),
    section: sectionSchema.default({ ...DEFAULT_SECTION, paddingY: 'lg' }),
  }),
  fields: {
    badge: { type: 'text', label: 'Badge', group: CONTENT },
    title: { type: 'textarea', label: 'Headline', group: CONTENT },
    subtitle: { type: 'textarea', label: 'Subheadline', group: CONTENT },
    primaryButtonText: { type: 'text', label: 'Primary button text', group: CONTENT },
    primaryButtonLink: urlField('Primary button link'),
    secondaryButtonText: { type: 'text', label: 'Secondary button text', group: CONTENT },
    secondaryButtonLink: urlField('Secondary button link'),
    imageUrl: mediaField('Image'),
    imageAlt: {
      type: 'text',
      label: 'Image alt text',
      group: CONTENT,
      when: props => !!props.imageUrl,
    },
    alignment: { type: 'radio', label: 'Alignment', group: CONTENT, options: ALIGN_OPTIONS },
    section: sectionField,
  },
  render: Hero,
});

export const ButtonBlock = defineBlock({
  type: 'Button',
  label: 'Button',
  category: 'layout',
  icon: 'button',
  keywords: ['link', 'cta'],
  inlineProps: ['label'],
  schema: z.object({
    label: z.string().default(''),
    link: urlSchema.default(''),
    alignment: alignment.default('center'),
    section: sectionSchema.default(DEFAULT_SECTION),
  }),
  fields: {
    label: { type: 'text', label: 'Label', group: CONTENT },
    link: urlField('Link'),
    alignment: { type: 'radio', label: 'Alignment', group: CONTENT, options: ALIGN_OPTIONS },
    section: sectionField,
  },
  render: Button,
});

export const SpacerBlock = defineBlock({
  type: 'Spacer',
  label: 'Spacer',
  category: 'layout',
  icon: 'spacer',
  keywords: ['gap', 'space'],
  schema: z.object({
    height: z.number().min(0).max(400).default(96),
    section: sectionSchema.default(DEFAULT_SECTION),
  }),
  fields: {
    height: { type: 'number', label: 'Height (px)', group: CONTENT, min: 0, max: 400, step: 4 },
    section: sectionField,
  },
  render: Spacer,
});

export const NATIVE_BLOCKS = [HeroBlock, ButtonBlock, SpacerBlock];
