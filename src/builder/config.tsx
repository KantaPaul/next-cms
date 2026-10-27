import type { Config, Field, Fields } from '@measured/puck';
import type { ComponentType } from 'react';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { cn } from '@/lib/utils/cn';
import {
  getBlogFilterOptions,
  getRelatedPosts,
  queryBlogPosts,
} from '@/server/actions/blog.actions';
// import type { BuilderItem } from './data';
import {
  type BlogActiveFilters,
  BlogPosts,
  type BlogPostsProps,
  PostContent,
  PostFeaturedImage,
  PostMeta,
  PostTitle,
  RelatedPosts,
} from './blocks/blog';
import {
  Code,
  CollectionItem,
  Columns,
  ContactForm,
  Embed,
  Gallery,
  GlobalRef,
  ImageBlock,
  RichText,
  renderSlot,
  type SlotValue,
  Video,
} from './blocks/content';
import { ImageMorph } from './blocks/image-morph';
import { Accordion, Slider, Tabs } from './blocks/interactive';
import { Button, Spacer } from './blocks/layout';
import { Map as MapBlock } from './blocks/map';
import {
  Cta,
  Faq,
  Features,
  Hero,
  LogoCloud,
  Pricing,
  Stats,
  Team,
  Testimonials,
  Timeline,
} from './blocks/marketing';
import { Newsletter } from './blocks/newsletter';
import { DEFAULT_SECTION } from './blocks/section';
import { ImageMorphField } from './controls/image-morph';
import { PageTransitionField } from './controls/page-transition';
import { SectionField } from './controls/section-inspector';
import { customBlockEntries, customBlocks } from './custom';
import {
  CategoryLockField,
  GlobalBlockSelectField,
  IconPickerField,
  MediaUrlField,
  RichTextField,
  TagLockField,
  UrlField,
} from './fields/client-fields';
import { ContactFormOptionsField } from './fields/contact-form-options-field';
import { MotionScope } from './motion';
import { POST_BLOCK_TYPES, type PostView, SAMPLE_POST } from './post-template';
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
const url = (label: string): Field => ({
  type: 'custom',
  label,
  render: UrlField as never,
});
const icon = (label: string): Field => ({
  type: 'custom',
  label,
  render: IconPickerField as never,
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
      panels={(items ?? []).map(
        (item: { label?: string; title?: string; content?: SlotValue }) => ({
          label: item?.label ?? item?.title,
          node: renderSlot(item?.content),
        })
      )}
    />
  );
  Render.displayName = `Panels(${Component.displayName || Component.name || 'Component'})`;
  return Render;
};

/**
 * Puck only turns an array-item slot into a drop zone when the item has that key.
 * Default panels and blocks saved before this fix omit `content`, so backfill it.
 */
// const ensurePanelSlots = (data: { props?: AnyProps }) => {
//   const items = data.props?.items;
//   if (!Array.isArray(items) || items.every(item => Array.isArray(item?.content))) return data;
//   return {
//     ...data,
//     props: {
//       ...data.props,
//       items: items.map(item => (Array.isArray(item?.content) ? item : { ...item, content: [] })),
//     },
//   };
// };

export const builderConfig: Config = {
  categories: {
    heroes: { title: 'Heroes & calls to action', components: ['Hero', 'CTA'] },
    marketing: {
      title: 'Marketing',
      components: [
        'Features',
        'Stats',
        'Pricing',
        'Testimonials',
        'FAQ',
        'LogoCloud',
        'Team',
        'Timeline',
      ],
    },
    content: {
      title: 'Content',
      components: [
        'RichText',
        'Image',
        'Gallery',
        'Video',
        'Embed',
        'Map',
        'Code',
        'Newsletter',
      ],
    },
    contact: { title: 'Contact form', components: ['ContactForm'] },
    blog: { title: 'Blog', components: ['BlogPosts'] },
    layout: {
      title: 'Layout',
      components: [
        'Columns',
        'Slider',
        'Tabs',
        'Accordion',
        'Button',
        'Spacer',
      ],
    },
    collections: {
      title: 'Collections',
      components: ['CollectionItem'],
    },
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
    ...customBlockEntries,
    Hero: {
      label: 'Hero',
      fields: withSection({
        badge: text('Badge'),
        title: textarea('Headline'),
        subtitle: textarea('Subheadline'),
        primaryButtonText: text('Primary button text'),
        primaryButtonLink: url('Primary button link'),
        secondaryButtonText: text('Secondary button text'),
        secondaryButtonLink: url('Secondary button link'),
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
            icon: icon('Icon'),
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
            buttonLink: url('Button link'),
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
        primaryButtonLink: url('Primary button link'),
        secondaryButtonText: text('Secondary button text'),
        secondaryButtonLink: url('Secondary button link'),
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
    Video: {
      label: 'Video',
      fields: withSection({
        url: text('Video URL'),
      }),
      defaultProps: {
        url: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Video),
    },
    Embed: {
      label: 'Embed',
      fields: withSection({
        url: text('Embed URL'),
      }),
      defaultProps: {
        url: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Embed),
    },
    Map: {
      label: 'Map',
      fields: withSection({
        address: text('Address'),
      }),
      defaultProps: {
        address: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(MapBlock),
    },
    Code: {
      label: 'Code',
      fields: withSection({
        code: textarea('Code'),
      }),
      defaultProps: {
        code: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Code),
    },
    Newsletter: {
      label: 'Newsletter',
      fields: withSection({
        title: text('Title'),
        subtitle: text('Short text'),
        email: text('Email'),
      }),
      defaultProps: {
        title: 'Newsletter',
        subtitle: '',
        email: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Newsletter),
    },
    ImageMorph: {
      label: 'Image morph',
      fields: withSection({
        morph: {
          type: 'custom',
          label: 'Morph',
          render: ImageMorphField as never,
        },
      }),
      defaultProps: {
        morph: {
          effect: 'image',
          image: {
            url: '',
            opacity: 1,
            zoom: 1,
            posX: 50,
            posY: 50,
          },
          shape: { type: 'default' },
          timing: {
            easing: 'ease-in-out',
            direction: 'normal',
            loop: false,
            duration: 0.6,
            delay: 0,
            endDelay: 0,
          },
        },
        section: DEFAULT_SECTION,
      },
      render: renderBlock(ImageMorph),
    },
    RichText: {
      label: 'Rich text',
      fields: withSection({
        content: {
          type: 'custom',
          label: 'Content',
          render: RichTextField as never,
        },
        width: select('Width', [
          { label: 'Narrow', value: 'narrow' },
          { label: 'Normal', value: 'normal' },
          { label: 'Wide', value: 'wide' },
        ]),
      }),
      defaultProps: {
        content: '<h2>Section heading</h2><p>Write your content here.</p>',
        width: 'normal',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(RichText),
    },
    Image: {
      label: 'Image',
      fields: withSection({
        url: media('Image'),
        alt: text('Alt text'),
        caption: text('Caption'),
        aspect: select('Aspect ratio', [
          { label: 'Original', value: 'auto' },
          { label: '16:9', value: 'video' },
          { label: 'Square', value: 'square' },
          { label: '21:9', value: 'wide' },
        ]),
        width: select('Width', [
          { label: 'Normal', value: 'normal' },
          { label: 'Wide', value: 'wide' },
          { label: 'Full', value: 'full' },
        ]),
        imageWidth: {
          type: 'number',
          label: 'Image width (px)',
          min: 0,
          max: 4000,
        },
        imageHeight: {
          type: 'number',
          label: 'Image height (px)',
          min: 0,
          max: 4000,
        },
        objectFit: select('Object fit', [
          { label: 'Cover', value: 'cover' },
          { label: 'Contain', value: 'contain' },
          { label: 'Fill', value: 'fill' },
        ]),
        link: url('Link (optional)'),
      }),
      defaultProps: {
        url: '',
        alt: '',
        caption: '',
        aspect: 'auto',
        width: 'normal',
        objectFit: 'cover',
        link: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(ImageBlock),
    },
    Gallery: {
      label: 'Gallery',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        columns: select('Columns', [
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ]),
        gap: select('Gap', [
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
        ]),
        items: {
          type: 'array',
          label: 'Images',
          getItemSummary: (item: {
            alt?: string;
            caption?: string;
            url?: string;
          }) => item.alt || item.caption || (item.url ? 'Image' : 'Empty'),
          defaultItemProps: { url: '', alt: '', caption: '' },
          arrayFields: {
            url: media('Image'),
            alt: text('Alt text'),
            caption: text('Caption'),
          },
        },
      }),
      defaultProps: {
        eyebrow: '',
        title: 'Gallery',
        subtitle: '',
        columns: 3,
        gap: 'md',
        items: [
          { url: '', alt: '', caption: '' },
          { url: '', alt: '', caption: '' },
          { url: '', alt: '', caption: '' },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Gallery),
    },
    ContactForm: {
      label: 'Contact form',
      fields: withSection({
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        submitText: text('Submit button'),
        successMessage: text('Success message'),
        actionUrl: text('Form action URL (optional)'),
        fields: {
          type: 'array',
          label: 'Fields',
          getItemSummary: (item: { label?: string }) => item.label || 'Field',
          defaultItemProps: {
            label: 'Field',
            name: 'field',
            type: 'text',
            required: false,
            placeholder: '',
            options: '',
          },
          arrayFields: {
            label: text('Label'),
            name: text('Name'),
            type: select('Type', [
              { label: 'Text', value: 'text' },
              { label: 'Email', value: 'email' },
              { label: 'Phone', value: 'tel' },
              { label: 'Textarea', value: 'textarea' },
              { label: 'Number', value: 'number' },
              { label: 'Date', value: 'date' },
              { label: 'URL', value: 'url' },
              { label: 'Dropdown', value: 'select' },
              { label: 'Radio', value: 'radio' },
              { label: 'Checkbox', value: 'checkbox' },
            ]),
            placeholder: text('Placeholder'),
            options: {
              type: 'custom',
              label: 'Options, one per line',
              render: ContactFormOptionsField as never,
            },
            required: yesNo('Required'),
          },
        },
      }),
      defaultProps: {
        title: 'Contact us',
        subtitle: '',
        submitText: 'Send message',
        successMessage: 'Thanks! We will be in touch soon.',
        actionUrl: '',
        fields: [
          { label: 'Name', name: 'name', type: 'text', required: true },
          { label: 'Email', name: 'email', type: 'email', required: true },
          {
            label: 'Message',
            name: 'message',
            type: 'textarea',
            required: true,
          },
        ],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(ContactForm),
    },
    Button: {
      label: 'Button',
      fields: withSection({
        label: text('Label'),
        link: url('Link'),
        alignment: {
          type: 'radio',
          label: 'Alignment',
          options: ALIGN_OPTIONS,
        },
      }),
      defaultProps: {
        label: '',
        link: '',
        alignment: 'center',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Button),
    },
    Spacer: {
      label: 'Spacer',
      fields: withSection({
        height: {
          type: 'number',
          label: 'Height (px)',
          min: 0,
          max: 400,
        },
      }),
      defaultProps: {
        height: 96,
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Spacer),
    },
    CollectionItem: {
      label: 'Collection item',
      fields: withSection({
        field: text('Field key (optional)'),
      }),
      defaultProps: {
        field: '',
        section: DEFAULT_SECTION,
      },
      render: renderBlock(CollectionItem),
    },
    GlobalRef: {
      label: 'Global block',
      fields: {
        globalBlockId: {
          type: 'custom',
          label: 'Block',
          render: GlobalBlockSelectField as never,
        },
      },
      defaultProps: { globalBlockId: '' },
      resolveData: async data => {
        const id = (data.props as { globalBlockId?: string }).globalBlockId;
        if (!id)
          return {
            ...data,
            props: { ...data.props, blocks: [], globalBlockName: '' },
          };
        const result = await getGlobalBlockContent(id);
        return {
          ...data,
          props: {
            ...data.props,
            blocks: result?.blocks ?? [],
            globalBlockName: result?.name ?? '',
          },
        };
      },
      render: renderBlock(GlobalRef),
    },
    LogoCloud: {
      label: 'Logo cloud',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        items: {
          type: 'array',
          label: 'Logos',
          getItemSummary: (item: { url?: string }) => item.url || 'Logo',
          defaultItemProps: { url: '', alt: '', link: '' },
          arrayFields: {
            url: media('Logo'),
            alt: text('Alt text'),
            link: url('Link (optional)'),
          },
        },
      }),
      defaultProps: {
        eyebrow: '',
        title: 'Trusted by teams',
        subtitle: '',
        items: [],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(LogoCloud),
    },
    Team: {
      label: 'Team',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        items: {
          type: 'array',
          label: 'Members',
          getItemSummary: (item: { name?: string }) => item.name || 'Member',
          defaultItemProps: { photo: '', name: '', role: '' },
          arrayFields: {
            photo: media('Photo'),
            name: text('Name'),
            role: text('Role'),
          },
        },
      }),
      defaultProps: {
        eyebrow: '',
        title: 'Meet the team',
        items: [],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Team),
    },
    Timeline: {
      label: 'Timeline',
      fields: withSection({
        eyebrow: text('Eyebrow'),
        title: text('Title'),
        items: {
          type: 'array',
          label: 'Events',
          getItemSummary: (item: { title?: string }) => item.title || 'Event',
          defaultItemProps: { date: '', title: '', body: '' },
          arrayFields: {
            date: text('Date'),
            title: text('Title'),
            body: textarea('Body'),
          },
        },
      }),
      defaultProps: {
        eyebrow: '',
        title: 'Timeline',
        items: [],
        section: DEFAULT_SECTION,
      },
      render: renderBlock(Timeline),
    },
    BlogPosts: {
      label: 'Blog posts',
      fields: withSection({
        title: text('Title'),
        subtitle: textarea('Subtitle'),
        layout: select('Layout', [
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
        ]),
        columns: select('Columns', [
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ]),
        pageSize: { type: 'number', label: 'Posts per page', min: 1, max: 48 },
        showSearch: yesNo('Search'),
        showCategoryFilter: yesNo('Category filter'),
        showTagFilter: yesNo('Tag filter'),
        showSort: yesNo('Sort'),
        showPagination: yesNo('Pagination'),
        showImage: yesNo('Card image'),
        showExcerpt: yesNo('Card excerpt'),
        showAuthor: yesNo('Card author'),
        showDate: yesNo('Card date'),
        lockedCategory: {
          type: 'custom',
          label: 'Category lock',
          render: CategoryLockField as never,
        },
        lockedTag: {
          type: 'custom',
          label: 'Tag lock',
          render: TagLockField as never,
        },
        emptyMessage: text('Empty message'),
      }),
      defaultProps: {
        title: 'Latest posts',
        subtitle: '',
        layout: 'grid',
        columns: 3,
        pageSize: 9,
        showSearch: true,
        showCategoryFilter: true,
        showTagFilter: true,
        showSort: true,
        showPagination: true,
        showImage: true,
        showExcerpt: true,
        showAuthor: true,
        showDate: true,
        emptyMessage: '',
        section: DEFAULT_SECTION,
      },
      resolveData: async (data, { metadata }) => {
        const props = data.props as BlogPostsProps;
        const params = (metadata?.searchParams ?? {}) as Record<
          string,
          string | string[] | undefined
        >;
        const one = (key: string) => {
          const value = params[key];
          return (Array.isArray(value) ? value[0] : value) || undefined;
        };
        const sortRaw = one('sort');
        const sort =
          sortRaw === 'newest' || sortRaw === 'oldest' || sortRaw === 'title'
            ? sortRaw
            : undefined;
        const page = Number(one('page')) || 1;
        const active: BlogActiveFilters = {
          q: one('q'),
          category: props.lockedCategory || one('category'),
          tag: props.lockedTag || one('tag'),
          sort,
          page,
        };
        const language =
          typeof metadata?.language === 'string'
            ? metadata.language
            : undefined;
        const result = await queryBlogPosts({
          language,
          q: active.q,
          category: active.category,
          tag: active.tag,
          sort,
          page,
          size: Number(props.pageSize) || 9,
        });
        const options = await getBlogFilterOptions(language);
        return {
          ...data,
          props: {
            ...data.props,
            posts: result.posts,
            total: result.total,
            totalPages: result.totalPages,
            active,
            filterOptions: options,
          },
        };
      },
      render: renderBlock(BlogPosts),
    },
    Slider: {
      label: 'Slider',
      fields: withSection({
        items: {
          type: 'array',
          label: 'Slides',
          getItemSummary: (item: { title?: string }) => item.title || 'Slide',
          defaultItemProps: { title: 'Slide', content: [] },
          arrayFields: {
            title: text('Title'),
            content: { type: 'slot', label: 'Slide Content' },
          },
        },
      }),
      defaultProps: {
        items: [{ title: 'Slide 1', content: [] }],
        section: DEFAULT_SECTION,
      },
      render: renderPanels(Slider),
    },
    Tabs: {
      label: 'Tabs',
      fields: withSection({
        items: {
          type: 'array',
          label: 'Tabs',
          getItemSummary: (item: { label?: string }) => item.label || 'Tab',
          defaultItemProps: { label: 'Tab 1', content: [] },
          arrayFields: {
            label: text('Label'),
            content: { type: 'slot', label: 'Tab Content' },
          },
        },
      }),
      defaultProps: {
        items: [{ label: 'Tab 1', content: [] }],
        section: DEFAULT_SECTION,
      },
      render: renderPanels(Tabs),
    },
    Accordion: {
      label: 'Accordion',
      fields: withSection({
        items: {
          type: 'array',
          label: 'Items',
          getItemSummary: (item: { title?: string }) => item.title || 'Item',
          defaultItemProps: { title: 'Question?', content: [] },
          arrayFields: {
            title: text('Title'),
            content: { type: 'slot', label: 'Accordion Content' },
          },
        },
      }),
      defaultProps: {
        items: [{ title: 'Item 1', content: [] }],
        section: DEFAULT_SECTION,
      },
      render: renderPanels(Accordion),
    },
  },
};

/** Reads the post being rendered from Puck metadata; the template builder supplies a sample post. */

const renderPostBlock = (Component: ComponentType<any>) => {
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

/** The page blocks plus blocks bound to the current post, for the single-post template and custom post layouts. */
const POST_SECTION = { ...DEFAULT_SECTION, paddingY: 'sm' as const };

export const postBuilderConfig: Config = {
  ...builderConfig,
  categories: {
    post: { title: 'Post', components: [...POST_BLOCK_TYPES] },
    ...builderConfig.categories,
  },
  components: {
    ...builderConfig.components,
    PostTitle: {
      label: 'Post title',
      fields: withSection({
        showBackLink: yesNo('Link back to the blog page'),
        showExcerpt: yesNo('Show excerpt'),
        alignment: {
          type: 'radio',
          label: 'Alignment',
          options: ALIGN_OPTIONS,
        },
      }),
      defaultProps: {
        showBackLink: true,
        showExcerpt: true,
        alignment: 'left',
        section: POST_SECTION,
      },
      render: renderPostBlock(PostTitle),
    },
    PostFeaturedImage: {
      label: 'Featured image',
      fields: withSection({
        aspect: select('Aspect ratio', [
          { label: 'Wide (21:9)', value: 'wide' },
          { label: 'Video (16:9)', value: 'video' },
          { label: 'Square', value: 'square' },
          { label: 'Original', value: 'auto' },
        ]),
      }),
      defaultProps: {
        aspect: 'wide',
        section: POST_SECTION,
      },
      render: renderPostBlock(PostFeaturedImage),
    },
    PostMeta: {
      label: 'Post details',
      fields: withSection({
        showAuthor: yesNo('Author'),
        showDate: yesNo('Date'),
        showCategories: yesNo('Categories'),
        showTags: yesNo('Tags'),
      }),
      defaultProps: {
        showAuthor: true,
        showDate: true,
        showCategories: true,
        showTags: true,
        section: POST_SECTION,
      },
      render: renderPostBlock(PostMeta),
    },
    PostContent: {
      label: 'Post content',
      fields: withSection({
        width: select('Width', [
          { label: 'Narrow', value: 'narrow' },
          { label: 'Normal', value: 'normal' },
          { label: 'Wide', value: 'wide' },
        ]),
      }),
      defaultProps: { width: 'normal', section: POST_SECTION },
      render: renderPostBlock(PostContent),
    },
    RelatedPosts: {
      label: 'Related posts',
      fields: withSection({
        title: text('Title'),
        limit: { type: 'number', label: 'Number of posts', min: 1, max: 12 },
        columns: select('Columns', [
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
        ]),
        showImage: yesNo('Card image'),
        showExcerpt: yesNo('Card excerpt'),
        showAuthor: yesNo('Card author'),
        showDate: yesNo('Card date'),
      }),
      defaultProps: {
        title: 'Related posts',
        limit: 3,
        columns: 3,
        showImage: true,
        showExcerpt: true,
        showAuthor: false,
        showDate: true,
        section: DEFAULT_SECTION,
      },
      resolveData: async (data, { metadata }) => {
        const post = (metadata?.post as PostView | undefined) ?? SAMPLE_POST;
        const posts = await getRelatedPosts({
          postId: post.id,
          categoryIds: post.categories.map(c => c.id),
          language: post.language,
          limit: Number((data.props as { limit?: number }).limit) || 3,
        });
        return { ...data, props: { ...data.props, posts } };
      },
      render: renderBlock(RelatedPosts),
    },
  },
};

export const BLOCK_TYPES = Object.keys(builderConfig.components);

export const BUILDER_VIEWPORTS = [
  {
    width: 375,
    height: 'auto' as const,
    label: 'Mobile',
    icon: 'Smartphone' as const,
  },
  {
    width: 768,
    height: 'auto' as const,
    label: 'Tablet',
    icon: 'Tablet' as const,
  },
  {
    width: 1280,
    height: 'auto' as const,
    label: 'Desktop',
    icon: 'Monitor' as const,
  },
];
