import { defineBlock } from '@nextcms/builder-core';
import {
  ApiTable,
  BeforeAfter,
  Callout,
  DocSearch,
  DocsPager,
  DocsSidebar,
  Kbd,
  PortfolioGrid,
  ProjectMeta,
  ReadingProgress,
  Steps,
} from '../blocks/phase5-blocks';

export const CalloutBlock = defineBlock({
  type: 'Callout',
  label: 'Callout',
  render: Callout as never,
  defaults: {
    variant: 'info',
    title: 'Note',
    body: '<p>Highlight important context, tips, or warnings for readers.</p>',
  },
  fields: {
    variant: {
      type: 'select',
      label: 'Variant',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Tip', value: 'tip' },
        { label: 'Warning', value: 'warning' },
        { label: 'Danger', value: 'danger' },
      ],
    },
    title: { type: 'text', label: 'Title' },
    body: { type: 'textarea', label: 'Body (HTML)' },
  },
});

export const StepsBlock = defineBlock({
  type: 'Steps',
  label: 'Steps',
  render: Steps as never,
  defaults: {
    items: [
      { title: 'Install dependencies', body: 'Run <code>pnpm install</code> in your workspace.' },
      { title: 'Configure environment', body: 'Copy <code>.env.example</code> to <code>.env</code>.' },
      { title: 'Start the server', body: 'Run <code>pnpm dev</code> and open localhost:3001.' },
    ],
  },
  fields: {
    items: {
      type: 'list',
      label: 'Steps',
      item: {
        title: { type: 'text', label: 'Title' },
        body: { type: 'textarea', label: 'Body (HTML)' },
      },
    },
  },
});

export const KbdBlock = defineBlock({
  type: 'Kbd',
  label: 'Keyboard shortcut',
  render: Kbd as never,
  defaults: {
    keys: '⌘, K',
  },
  fields: {
    keys: { type: 'text', label: 'Keys (comma-separated)' },
  },
});

export const ApiTableBlock = defineBlock({
  type: 'ApiTable',
  label: 'API / Props table',
  render: ApiTable as never,
  defaults: {
    rows: [
      {
        name: 'variant',
        type: "'info' | 'tip' | 'warning' | 'danger'",
        defaultValue: "'info'",
        description: 'Visual style of the callout.',
      },
    ],
  },
  fields: {
    rows: {
      type: 'list',
      label: 'Rows',
      item: {
        name: { type: 'text', label: 'Name' },
        type: { type: 'text', label: 'Type' },
        defaultValue: { type: 'text', label: 'Default' },
        description: { type: 'text', label: 'Description' },
      },
    },
  },
});

export const BeforeAfterBlock = defineBlock({
  type: 'BeforeAfter',
  label: 'Before / After',
  render: BeforeAfter as never,
  defaults: {
    beforeLabel: 'Before',
    afterLabel: 'After',
    aspectRatio: '16/9',
  },
  fields: {
    beforeImage: { type: 'text', label: 'Before image URL' },
    afterImage: { type: 'text', label: 'After image URL' },
    beforeLabel: { type: 'text', label: 'Before label' },
    afterLabel: { type: 'text', label: 'After label' },
    aspectRatio: { type: 'text', label: 'Aspect ratio' },
  },
});

export const ReadingProgressBlock = defineBlock({
  type: 'ReadingProgress',
  label: 'Reading progress',
  render: ReadingProgress as never,
  defaults: {
    color: '#C8553D',
    height: 3,
  },
  fields: {
    color: { type: 'text', label: 'Bar color' },
    height: { type: 'number', label: 'Height (px)' },
  },
});

export const DocsSidebarBlock = defineBlock({
  type: 'DocsSidebar',
  label: 'Docs sidebar',
  render: DocsSidebar as never,
  defaults: {
    title: 'Documentation',
    items: [],
  },
  fields: {
    title: { type: 'text', label: 'Heading' },
  },
});

export const DocsPagerBlock = defineBlock({
  type: 'DocsPager',
  label: 'Docs prev/next pager',
  render: DocsPager as never,
  defaults: {},
  fields: {},
});

export const DocSearchBlock = defineBlock({
  type: 'DocSearch',
  label: 'Docs search (Cmd-K)',
  render: DocSearch as never,
  defaults: {
    placeholder: 'Search docs...',
  },
  fields: {
    placeholder: { type: 'text', label: 'Placeholder' },
  },
});

export const PortfolioGridBlock = defineBlock({
  type: 'PortfolioGrid',
  label: 'Portfolio grid',
  render: PortfolioGrid as never,
  defaults: {
    columns: 3,
    projects: [],
  },
  fields: {
    columns: {
      type: 'select',
      label: 'Columns',
      options: [
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
      ],
    },
  },
});

export const ProjectMetaBlock = defineBlock({
  type: 'ProjectMeta',
  label: 'Project meta',
  render: ProjectMeta as never,
  defaults: {
    client: 'Northwind',
    year: '2026',
    role: 'Lead Product Designer',
    services: 'Brand, UI/UX, Design System',
  },
  fields: {
    client: { type: 'text', label: 'Client' },
    year: { type: 'text', label: 'Year' },
    role: { type: 'text', label: 'Role' },
    services: { type: 'text', label: 'Services' },
    liveUrl: { type: 'text', label: 'Live URL' },
  },
});

export const PHASE5_BLOCKS = [
  CalloutBlock,
  StepsBlock,
  KbdBlock,
  ApiTableBlock,
  BeforeAfterBlock,
  ReadingProgressBlock,
  DocsSidebarBlock,
  DocsPagerBlock,
  DocSearchBlock,
  PortfolioGridBlock,
  ProjectMetaBlock,
];
