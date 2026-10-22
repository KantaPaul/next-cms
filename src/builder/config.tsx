import type { Config, Field, Fields } from '@measured/puck';
import type { ComponentType } from 'react';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { cn } from '@/lib/utils/cn';
import {
  getBlogFilterOptions,
  getRelatedPosts,
  queryBlogPosts,
} from '@/server/actions/blog.actions';
import type { BuilderItem } from './data';
import {
  BlogPosts,
  PostContent,
  PostFeaturedImage,
  PostMeta,
  PostTitle,
  RelatedPosts,
  type BlogActiveFilters,
  type BlogPostsProps,
} from './blocks/blog';
import {
  Columns,
  ContactForm,
  Gallery,
  GlobalRef,
  ImageBlock,
  renderSlot,
  RichText,
  type SlotValue,
} from './blocks/content';
import { Accordion, Slider, Tabs } from './blocks/interactive';
import {
  Cta,
  Faq,
  Features,
  Hero,
  Pricing,
  Stats,
  Testimonials,
} from './blocks/marketing';
import { DEFAULT_SECTION } from './blocks/section';
import { PageTransitionField } from './controls/page-transition';
import { SectionField } from './controls/section-inspector';
import {
  CategoryLockField,
  GlobalBlockSelectField,
  MediaUrlField,
  RichTextField,
  TagLockField,
} from './fields/client-fields';
import { ICON_OPTIONS } from './icons';
import { MotionScope } from './motion';
import { POST_BLOCK_TYPES, SAMPLE_POST, type PostView } from './post-template';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';

/* ---------- field helpers ---------- */

const text = (label: string): Field => ({ type: 'text', label });
const textarea = (label: string): Field => ({ type: 'textarea', label });
const select = (
  label: string,
  options: { label: string; value: string | number | boolean }[]
): Field => ({
  type: 'select',
  label,
  options,
});
const yesNo = (label: string): Field => ({
  type: 'radio',
  label,
  options: [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ],
});
const media = (label: string): Field => ({
  type: 'custom',
  label,
  render: MediaUrlField as never,
});

/** Style, layout, and motion for every block. The floating inspector shows it as the Style and Layout tabs. */
const sectionField: Field = {
  type: 'custom',
  label: 'Section',
  render: SectionField as never,
};

const withSection = (fields: Fields): Fields => ({
  ...fields,
  section: sectionField,
});

const ALIGN_OPTIONS = [
  { label: 'Center', value: 'center' },
  { label: 'Left', value: 'left' },
];

/* ---------- root ---------- */

export type RootProps = {
  title?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | 'full';
  theme?: 'site' | 'default' | 'light' | 'dark';
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  pageTransition?: 'none' | 'fade' | 'slide-up';
};

const MAX_WIDTH = { md: '48rem', lg: '64rem', xl: '72rem', full: '100%' };
const ROOT_PADDING = { none: '', sm: 'py-4', md: 'py-8', lg: 'py-16' };

/* ---------- config ---------- */

type AnyProps = Record<string, any>;

/** Adapts a plain block component to Puck's render signature. */

const renderBlock = (Component: ComponentType<any>) => {
  const Render = ({ puck, id: _id, ...props }: AnyProps) => (
    <Component {...props} editing={!!puck?.isEditing} />
  );
  Render.displayName = `Block(${Component.displayName || Component.name || 'Component'})`;
  return Render;
};

/**
 * Slider, Tabs, and Accordion are client components. Puck slot functions live inside
 * each panel object, and Next.js cannot serialize those functions across the server
 * boundary. Resolve every slot here, then pass plain nodes.
 */
const renderPanels = (Component: ComponentType<any>) => {
  const Render = ({ puck, id: _id, items, ...props }: AnyProps) => (
    <Component
      {...props}
      editing={!!puck?.isEditing}
      panels={(items ?? []).map((item: { label?: string; content?: SlotValue }) => ({
        label: item?.label,
        node: renderSlot(item?.content),
      }))}
    />
  );
  Render.displayName = `Panels(${Component.displayName || Component.name || 'Component'})`;
  return Render;
};

/**
 * Puck only turns an array-item slot into a drop zone when the item has that key.
 * Default panels and blocks saved before this fix omit `content`, so backfill it.
 */
const ensurePanelSlots = (data: { props?: AnyProps }) => {
  const items = data.props?.items;
  if (!Array.isArray(items) || items.every(item => Array.isArray(item?.content))) return data;
  return {
    ...data,
    props: {
      ...data.props,
      items: items.map(item => (Array.isArray(item?.content) ? item : { ...item, content: [] })),
    },
  };
};

export const builderConfig: Config = {
  categories: {
    heroes: { title: 'Heroes & calls to action', components: ['Hero', 'CTA'] },
    marketing: {
      title: 'Marketing',
      components: ['Features', 'Stats', 'Pricing', 'Testimonials', 'FAQ'],
    },
    content: {
      title: 'Content',
      components: ['RichText', 'Image', 'Gallery'],
    },
    contact: { title: 'Contact form', components: ['ContactForm'] },
    blog: { title: 'Blog', components: ['BlogPosts'] },
    layout: { title: 'Layout', components: ['Columns', 'Slider', 'Tabs', 'Accordion'] },
    global: { title: 'Global blocks', components: ['GlobalRef'] },
  },
  root: {
    fields: {
      maxWidth: select('Content width', [
        { label: 'Narrow (768px)', value: 'md' },
        { label: 'Medium (1024px)', value: 'lg' },
        { label: 'Wide (1152px)', value: 'xl' },
        { label: 'Full width', value: 'full' },
      ]),
      theme: select('Color mode', [
        { label: 'Follow site settings', value: 'site' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ]),
      paddingY: select('Page padding', [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ]),
      pageTransition: {
        type: 'custom',
        label: 'Page transition',
        render: PageTransitionField as never,
      },
    },
    defaultProps: {
      maxWidth: 'xl',
      theme: 'site',
      paddingY: 'none',
      pageTransition: 'none',
    },
    render: ({
      children,
      maxWidth,
      theme,
      paddingY,
      pageTransition,
      puck,
    }: AnyProps) => {
      const tokens = resolveThemeTokens(puck?.metadata?.themeTokens);
      const mode =
        theme === 'light' || theme === 'dark'
          ? theme
          : tokens.colorMode === 'dark'
            ? 'dark'
            : 'light';
      const fontUrl = fontStylesheetUrl(tokens);
      const editing = !!puck?.isEditing;

      return (
        <div
          className={cn(
            'site-root min-h-full',
            ROOT_PADDING[(paddingY as keyof typeof ROOT_PADDING) ?? 'none']
          )}
          data-site-theme={mode}
          style={{
            ...themeStyle(tokens),
            ['--site-max-width' as string]:
              MAX_WIDTH[(maxWidth as keyof typeof MAX_WIDTH) ?? 'xl'] ??
              MAX_WIDTH.xl,
          }}
        >
          {fontUrl && <link rel="stylesheet" href={fontUrl} />}
          {!editing && (
            <noscript>
              <style>
                {
                  '[data-motion]{opacity:1!important;transform:none!important;filter:none!important}'
                }
              </style>
            </noscript>
          )}
          <MotionScope
            editing={editing}
            preview={!!puck?.metadata?.motionPreview}
            transition={pageTransition}
          >
            {children}
          </MotionScope>
        </div>
      );
    },
  },
  components: {
    Hero: {
      label: 'Hero',
      fields: withSection({
        badge: text('Badge'),
        title: textarea('Headline'),
        subtitle: textarea('Subheadline'),
        primaryButtonText: text('Primary button text'),
        primaryButtonLink: text('Primary button link'),
        secondaryButtonText: text('Secondary button text'),
        secondaryButtonLink: text('Secondary button link'),
        imageUrl: media('Image'),
        imageAlt: text('Image alt text'),
        alignment: {
          type: 'radio',
          label: 'Alignment',
          options: ALIGN_OPTIONS,
        },
      }),
      defaultProps: {
        badge: 'New',
        title: 'A headline that explains what you do',
        subtitle:
          'One or two sentences that describe the value for your visitors.',
        primaryButtonText: 'Get started',
        primaryButtonLink: '#',
        secondaryButtonText: 'Learn more',
        secondaryButtonLink: '#',
        imageUrl: '',
        imageAlt: '',
        alignment: 'center',
        section: { ...DEFAULT_SECTION, paddingY: 'lg' },
      },
      render: renderBlock(Hero),
    },
    // REST_OF_FILE_CONTINUES_IN_NEXT_PUSH
  },
};
