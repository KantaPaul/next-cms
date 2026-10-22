/**
 * Database-free Puck render helpers and maps.
 * Used by the CMS builder config and by the exported standalone site.
 * No admin fields, server actions, or database imports.
 */
import type { Config } from '@measured/puck';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  BlogPosts,
  PostContent,
  PostFeaturedImage,
  PostMeta,
  PostTitle,
  RelatedPosts,
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
import { MotionScope } from './motion';
import { SAMPLE_POST, type PostView } from './post-template';
import { fontStylesheetUrl, resolveThemeTokens, themeStyle } from './theme';

type AnyProps = Record<string, any>;

export type RootProps = {
  title?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | 'full';
  theme?: 'site' | 'default' | 'light' | 'dark';
  paddingY?: 'none' | 'sm' | 'md' | 'lg';
  pageTransition?: 'none' | 'fade' | 'slide-up';
};

const MAX_WIDTH = { md: '48rem', lg: '64rem', xl: '72rem', full: '100%' };
const ROOT_PADDING = { none: '', sm: 'py-4', md: 'py-8', lg: 'py-16' };

/** Adapts a plain block component to Puck's render signature. */
export const renderBlock = (Component: ComponentType<any>) => {
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
export const renderPanels = (Component: ComponentType<any>) => {
  const Render = ({ puck, id: _id, items, ...props }: AnyProps) => (
    <Component
      {...props}
      editing={!!puck?.isEditing}
      panels={(items ?? []).map(
        (item: { label?: string; content?: SlotValue }) => ({
          label: item?.label,
          node: renderSlot(item?.content),
        })
      )}
    />
  );
  Render.displayName = `Panels(${Component.displayName || Component.name || 'Component'})`;
  return Render;
};

/** Reads the post being rendered from Puck metadata; the template builder supplies a sample post. */
export const renderPostBlock = (Component: ComponentType<any>) => {
  const Render = ({ puck, id: _id, ...props }: AnyProps) => (
    <Component
      {...props}
      post={(puck?.metadata?.post as PostView | undefined) ?? SAMPLE_POST}
      editing={!!puck?.isEditing}
    />
  );
  Render.displayName = `PostBlock(${Component.displayName || Component.name || 'Component'})`;
  return Render;
};

export function renderRoot({
  children,
  maxWidth,
  theme,
  paddingY,
  pageTransition,
  puck,
}: AnyProps) {
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
          MAX_WIDTH[(maxWidth as keyof typeof MAX_WIDTH) ?? 'xl'] ?? MAX_WIDTH.xl,
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
}

/** Component render map for public pages (no fields / resolveData). */
export const pageRenderComponents = {
  Hero: { render: renderBlock(Hero) },
  Features: { render: renderBlock(Features) },
  Stats: { render: renderBlock(Stats) },
  Pricing: { render: renderBlock(Pricing) },
  Testimonials: { render: renderBlock(Testimonials) },
  FAQ: { render: renderBlock(Faq) },
  CTA: { render: renderBlock(Cta) },
  Columns: { render: renderBlock(Columns) },
  RichText: { render: renderBlock(RichText) },
  Image: { render: renderBlock(ImageBlock) },
  Gallery: { render: renderBlock(Gallery) },
  ContactForm: { render: renderBlock(ContactForm) },
  GlobalRef: { render: renderBlock(GlobalRef) },
  BlogPosts: { render: renderBlock(BlogPosts) },
  Slider: { render: renderPanels(Slider) },
  Tabs: { render: renderPanels(Tabs) },
  Accordion: { render: renderPanels(Accordion) },
} as const;

/** Component render map for post templates (page blocks + post-bound blocks). */
export const postRenderComponents = {
  ...pageRenderComponents,
  PostTitle: { render: renderPostBlock(PostTitle) },
  PostFeaturedImage: { render: renderPostBlock(PostFeaturedImage) },
  PostMeta: { render: renderPostBlock(PostMeta) },
  PostContent: { render: renderPostBlock(PostContent) },
  RelatedPosts: { render: renderBlock(RelatedPosts) },
} as const;

/**
 * Minimal Puck configs used by the exported standalone site.
 * Content is already resolved (globals expanded, blog data attached where needed).
 */
export const pageRenderConfig = {
  root: { render: renderRoot },
  components: pageRenderComponents,
} as Config;

export const postRenderConfig = {
  root: { render: renderRoot },
  components: postRenderComponents,
} as Config;
