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
      components: ['RichText', 'Image', 'Gallery', 'ContactForm'],
    },
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
    Features: {
      label: 'Feature grid',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        columns: select('Columns', [
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ]),
        items: {
          type: 'array',
          label: 'Features',
          getItemSummary: (item: { title?: string }) => item.title || 'Feature',
          defaultItemProps: {
            icon: 'Sparkles',
            title: 'Feature',
            description: 'Describe the benefit.',
          },
          arrayFields: {
            icon: select('Icon', ICON_OPTIONS),
            title: text('Title'),
            description: textarea('Description'),
          },
        },
      }),
      defaultProps: {
        eyebrow: 'Features',
        title: 'Everything you need',
        subtitle: '',
        columns: 3,
        items: [
          {
            icon: 'Zap',
            title: 'Fast',
            description: 'Pages render at the edge in milliseconds.',
          },
          {
            icon: 'ShieldCheck',
            title: 'Secure',
            description: 'Role-based access and audit logs built in.',
          },
          {
            icon: 'Layers',
            title: 'Flexible',
            description: 'Visual builder and rich text in one place.',
          },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Features),
    },
    Stats: {
      label: 'Stats',
      fields: withSection({
        headline: text('Headline'),
        items: {
          type: 'array',
          label: 'Stats',
          getItemSummary: (item: { value?: string; label?: string }) =>
            [item.value, item.label].filter(Boolean).join(' · ') || 'Stat',
          defaultItemProps: { value: '99%', label: 'Label', change: '' },
          arrayFields: {
            value: text('Value'),
            label: text('Label'),
            change: text('Note'),
          },
        },
      }),
      defaultProps: {
        headline: 'Trusted by teams everywhere',
        items: [
          { value: '10k+', label: 'Customers', change: '' },
          { value: '99.9%', label: 'Uptime', change: '' },
          { value: '45ms', label: 'Median response', change: '' },
          { value: '4.9/5', label: 'Rating', change: '' },
        ],
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
      render: renderBlock(Stats),
    },
    Pricing: {
      label: 'Pricing table',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        showToggle: yesNo('Monthly / yearly toggle'),
        plans: {
          type: 'array',
          label: 'Plans',
          getItemSummary: (item: { name?: string }) => item.name || 'Plan',
          defaultItemProps: {
            name: 'Plan',
            price: '$0',
            yearlyPrice: '',
            period: 'per month',
            description: '',
            features: [{ text: 'Feature' }],
            buttonText: 'Choose plan',
            buttonLink: '#',
            popular: false,
          },
          arrayFields: {
            name: text('Name'),
            price: text('Monthly price'),
            yearlyPrice: text('Yearly price (optional)'),
            period: text('Period label'),
            description: textarea('Description'),
            features: {
              type: 'array',
              label: 'Features',
              getItemSummary: (item: { text?: string }) =>
                item.text || 'Feature',
              arrayFields: { text: text('Feature') },
            },
            buttonText: text('Button text'),
            buttonLink: text('Button link'),
            popular: yesNo('Highlight as popular'),
          },
        },
      }),
      defaultProps: {
        eyebrow: 'Pricing',
        title: 'Simple, transparent pricing',
        subtitle: '',
        showToggle: false,
        plans: [
          {
            name: 'Starter',
            price: '$0',
            period: 'forever',
            description: 'For side projects.',
            features: [{ text: '1 site' }, { text: 'Community support' }],
            buttonText: 'Start free',
            buttonLink: '#',
            popular: false,
          },
          {
            name: 'Pro',
            price: '$29',
            period: 'per month',
            description: 'For growing teams.',
            features: [
              { text: 'Unlimited sites' },
              { text: 'Priority support' },
            ],
            buttonText: 'Start trial',
            buttonLink: '#',
            popular: true,
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For large organisations.',
            features: [{ text: 'SSO' }, { text: 'SLA' }],
            buttonText: 'Contact sales',
            buttonLink: '#',
            popular: false,
          },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Pricing),
    },
    Testimonials: {
      label: 'Testimonials',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        items: {
          type: 'array',
          label: 'Testimonials',
          getItemSummary: (item: { author?: string }) =>
            item.author || 'Testimonial',
          defaultItemProps: {
            quote: 'A great product.',
            author: 'Name',
            role: '',
            company: '',
            avatar: '',
          },
          arrayFields: {
            quote: textarea('Quote'),
            author: text('Author'),
            role: text('Role'),
            company: text('Company'),
            avatar: media('Avatar'),
          },
        },
      }),
      defaultProps: {
        eyebrow: 'Testimonials',
        title: 'Loved by our customers',
        items: [
          {
            quote: 'It changed how our team ships pages.',
            author: 'Alex Kim',
            role: 'Head of Marketing',
            company: 'Acme',
            avatar: '',
          },
          {
            quote: 'The editor is a joy to use.',
            author: 'Sam Lee',
            role: 'Designer',
            company: 'Globex',
            avatar: '',
          },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Testimonials),
    },
    FAQ: {
      label: 'FAQ',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        items: {
          type: 'array',
          label: 'Questions',
          getItemSummary: (item: { question?: string }) =>
            item.question || 'Question',
          defaultItemProps: { question: 'Question?', answer: 'Answer.' },
          arrayFields: {
            question: text('Question'),
            answer: textarea('Answer'),
          },
        },
      }),
      defaultProps: {
        eyebrow: 'FAQ',
        title: 'Frequently asked questions',
        items: [
          {
            question: 'How do I get started?',
            answer: 'Sign up and create your first page in minutes.',
          },
          {
            question: 'Can I cancel anytime?',
            answer: 'Yes, there are no long-term contracts.',
          },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Faq),
    },
    CTA: {
      label: 'Call to action',
      fields: withSection({
        badge: text('Badge'),
        title: textarea('Title'),
        description: textarea('Description'),
        primaryButtonText: text('Primary button text'),
        primaryButtonLink: text('Primary button link'),
        secondaryButtonText: text('Secondary button text'),
        secondaryButtonLink: text('Secondary button link'),
        variant: select('Style', [
          { label: 'Gradient', value: 'gradient' },
          { label: 'Primary color', value: 'primary' },
          { label: 'Subtle', value: 'subtle' },
        ]),
      }),
      defaultProps: {
        badge: '',
        title: 'Ready to get started?',
        description: 'Join thousands of teams building faster.',
        primaryButtonText: 'Start now',
        primaryButtonLink: '#',
        secondaryButtonText: '',
        secondaryButtonLink: '',
        variant: 'gradient',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Cta),
    },
    Columns: {
      label: 'Columns',
      fields: withSection({
        layout: select('Layout', [
          { label: '2 equal', value: '1-1' },
          { label: '3 equal', value: '1-1-1' },
          { label: '4 equal', value: '1-1-1-1' },
          { label: 'Wide + narrow', value: '2-1' },
          { label: 'Narrow + wide', value: '1-2' },
        ]),
        gap: select('Gap', [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ]),
        verticalAlign: select('Vertical alignment', [
          { label: 'Top', value: 'start' },
          { label: 'Center', value: 'center' },
          { label: 'Bottom', value: 'end' },
        ]),
        column1: { type: 'slot', disallow: ['Columns', 'GlobalRef'] },
        column2: { type: 'slot', disallow: ['Columns', 'GlobalRef'] },
        column3: { type: 'slot', disallow: ['Columns', 'GlobalRef'] },
        column4: { type: 'slot', disallow: ['Columns', 'GlobalRef'] },
      }),
      defaultProps: {
        layout: '1-1',
        gap: 'md',
        verticalAlign: 'start',
        column1: [],
        column2: [],
        column3: [],
        column4: [],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Columns),
    },
