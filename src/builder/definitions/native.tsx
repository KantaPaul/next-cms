/**
 * Native blocks (ported from Puck config).
 */

import { defineBlock } from '@nextcms/builder-core';
import { z } from 'zod';
import {
  sectionSettingsSchema,
  elementStyleSchema,
  imageSizeSchema,
  safeUrlSchema,
} from '../schemas/style.schema';
import { VideoLibraryBlock } from '@/components/video/video-library';
import {
  BlogPosts,
  PostContent,
  PostFeaturedImage,
  PostMeta,
  PostTitle,
  RelatedPosts,
} from '../blocks/blog';
import {
  AuthorBio,
  AuthorCard,
  BookmarkButton,
  PostNavigation,
  ShareButtons,
} from '../blocks/post-extras';
import { Audio } from '../blocks/audio';
import { BookmarksDrawer } from '../blocks/bookmarks-client';
import { Container, DEFAULT_CONTAINER } from '../blocks/container';
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
  Video,
} from '../blocks/content';
import { CollectionBlockRef } from '../blocks/collection-block';
import { ResponsiveColumnsField } from '../fields/responsive-columns-field';
import { ImageMorph } from '../blocks/image-morph';
import { Accordion, Slider, Tabs } from '../blocks/interactive';
import { Button, Spacer } from '../blocks/layout';
import { Map as MapBlock } from '../blocks/map';
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
} from '../blocks/marketing';
import { MegaMenuCard } from '../blocks/mega-menu';
import { Newsletter } from '../blocks/newsletter';
import { QueryFilter } from '../blocks/query-filters';
import { Comments } from '../blocks/comments';
import {
  FILTER_OPTION_DEFAULTS,
  FILTER_OPTION_FIELDS,
  FILTER_OPTION_SCHEMA,
  prefixedFilterFields,
  prefixedFilterSchema,
} from './query-filter-fields';
import { LoopGrid } from '../blocks/loop-grid';
import { LoopItemField, QueryLoop } from '../blocks/query-loop';
import { PostTypeEntries } from '../blocks/post-type-entries';
import { SearchResults } from '../blocks/search-results';
import { DEFAULT_SECTION as _DS, DEFAULT_SECTION } from '../blocks/section';
import {
  AnnouncementBar,
  BackToTop,
  ContactInfo,
  Copyright,
  FooterColumns,
  FooterLinks,
  HeaderBar,
  HeaderColumns,
  LanguageSwitcherBlock,
  LegalLinks,
  Logo,
  MobileMenu,
  NavMenu,
  SearchBox,
  SocialIcons,
  ThemeToggle,
} from '../blocks/site-chrome';
import { FooterStyleField, HeaderStyleField } from '../controls/chrome-style';
import { ContainerLayoutControl } from '../controls/container-layout';
import { LoopCustomKeyField } from '../controls/loop-preview';
import {
  CptFieldFiltersField,
  CptTermLockField,
  LoopSortField,
  LoopTemplatePickerField,
} from '../controls/loop-grid-fields';
import { ImageMorphField } from '../controls/image-morph';
import { PageTransitionField } from '../controls/page-transition';
import { Example } from '../custom/example';
import {
  CategoryLockField,
  CollectionBlockSelectField,
  CollectionItemFieldSelect,
  CollectionSelectField,
  GlobalBlockSelectField,
  IconPickerField,
  MediaUrlField,
  RichTextField,
  TagLockField,
  UrlField,
  VideoSourcesField,
} from '../fields/client-fields';
import { ContactFormOptionsField } from '../fields/contact-form-options-field';
import { type ElementPart, ElementStyleControl } from '../controls/element-style';
import {
  CONTENT,
  iconField,
  mediaField,
  STYLE,
  ALL_PARTS,
  BUTTON_PARTS,
  elementStyle,
  headingStyles,
  cardFields,
  columnsField,
  groupControl,
  MEDIA_PARTS,
  sectionControls,
  TEXT_PARTS,
sectionSchema,
  urlField,
  urlSchema,
} from './fields';

export const exampleBlock = defineBlock({
  type: 'example',
  label: 'Example',
  category: 'layout',
  icon: 'example',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Example,
  fields: {
    heading: { label: 'Heading', group: CONTENT, type: 'text' },
    body: { label: 'Body', group: CONTENT, type: 'textarea' },
    ...sectionControls(),
  },
  defaults: {
    heading: 'Example block',
    body: 'A local plugin renders here. Remove the example to add your own.',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const HeroBlock = defineBlock({
  type: 'Hero',
  label: 'Hero',
  category: 'heroes',
  icon: 'hero',
  inlineProps: ['title', 'subtitle'],
  reorder: {
    parts: [
      { id: 'badge', label: 'Badge' },
      { id: 'title', label: 'Headline' },
      { id: 'subtitle', label: 'Subheadline' },
      { id: 'buttons', label: 'Buttons' },
    ],
  },
  schema: z.object({
    badge: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    primaryButtonText: z.string().optional(),
    primaryButtonLink: z.union([urlSchema, z.record(z.string(), z.unknown())]).optional(),
    secondaryButtonText: z.string().optional(),
    secondaryButtonLink: z.union([urlSchema, z.record(z.string(), z.unknown())]).optional(),
    imageUrl: safeUrlSchema.optional(),
    imageAlt: z.string().optional(),
    alignment: z.enum(['left', 'center']).optional(),
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: Hero,
  fields: {
    badge: { label: 'Badge', group: CONTENT, type: 'text' },
    title: { label: 'Headline', group: CONTENT, type: 'textarea' },
    subtitle: { label: 'Subheadline', group: CONTENT, type: 'textarea' },
    primaryButtonText: {
      label: 'Primary button text',
      group: CONTENT,
      type: 'text',
    },
    primaryButtonLink: {
      label: 'Primary button link',
      group: CONTENT,
      type: 'custom',
      render: UrlField,
    },
    secondaryButtonText: {
      label: 'Secondary button text',
      group: CONTENT,
      type: 'text',
    },
    secondaryButtonLink: {
      label: 'Secondary button link',
      group: CONTENT,
      type: 'custom',
      render: UrlField,
    },
    imageUrl: {
      label: 'Image',
      group: CONTENT,
      type: 'custom',
      render: MediaUrlField,
    },
    imageAlt: {
      label: 'Image alt text',
      group: CONTENT,
      type: 'text',
      when: (props: any) => !!props.imageUrl,
    },
    alignment: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Left', value: 'left' },
      ],
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    subtitle_style: elementStyle('subtitle', 'Subtitle Style', TEXT_PARTS),
    badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    primary_btn_style: elementStyle('primaryButton', 'Primary Button Style', BUTTON_PARTS),
    secondary_btn_style: elementStyle('secondaryButton', 'Secondary Button Style', BUTTON_PARTS),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    ...sectionControls(),
  },
  defaults: {
    badge: 'New',
    title: 'A headline that explains what you do',
    subtitle: 'One or two sentences that describe the value for your visitors.',
    primaryButtonText: 'Get started',
    primaryButtonLink: '#',
    secondaryButtonText: 'Learn more',
    secondaryButtonLink: '#',
    imageUrl: '',
    imageAlt: '',
    alignment: 'center',
    section: {
      paddingY: 'lg',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const FeaturesBlock = defineBlock({
  type: 'Features',
  label: 'Feature grid',
  category: 'marketing',
  icon: 'features',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
      { id: 'subtitle', label: 'Subtitle' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Features,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    columns: {
      label: 'Columns',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    items: {
      label: 'Features',
      group: CONTENT,
      type: 'list',
      item: {
        icon: {
          label: 'Icon',
          group: CONTENT,
          type: 'custom',
          render: IconPickerField,
        },
        title: { label: 'Title', group: CONTENT, type: 'text' },
        description: { label: 'Description', group: CONTENT, type: 'textarea' },
      },
      defaultItem: {
        icon: 'Sparkles',
        title: 'Feature',
        description: 'Describe the benefit.',
      },
    },
    item_title_style: elementStyle('itemTitle', 'Item Title Style', TEXT_PARTS),
    item_desc_style: elementStyle('itemDescription', 'Item Description Style', TEXT_PARTS),
    showIcons: { label: 'Show icons', group: CONTENT, type: 'toggle' },
    ...cardFields(),
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const StatsBlock = defineBlock({
  type: 'Stats',
  label: 'Stats',
  category: 'marketing',
  icon: 'stats',
  reorder: {
    parts: [
      { id: 'value', label: 'Value' },
      { id: 'label', label: 'Label' },
      { id: 'change', label: 'Note' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Stats,
  fields: {
    headline: { label: 'Headline', group: CONTENT, type: 'text' },
    items: {
      label: 'Stats',
      group: CONTENT,
      type: 'list',
      item: {
        value: { label: 'Value', group: CONTENT, type: 'text' },
        label: { label: 'Label', group: CONTENT, type: 'text' },
        change: { label: 'Note', group: CONTENT, type: 'text' },
      },
      defaultItem: { value: '99%', label: 'Label', change: '' },
    },
    value_style: elementStyle('value', 'Value Style', TEXT_PARTS),
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    columns: columnsField('Columns (desktop)', [2, 3, 4]),
    ...sectionControls(),
  },
  defaults: {
    headline: 'Trusted by teams everywhere',
    items: [
      { value: '10k+', label: 'Customers', change: '' },
      { value: '99.9%', label: 'Uptime', change: '' },
      { value: '45ms', label: 'Median response', change: '' },
      { value: '4.9/5', label: 'Rating', change: '' },
    ],
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const PricingBlock = defineBlock({
  type: 'Pricing',
  label: 'Pricing table',
  category: 'marketing',
  icon: 'pricing',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
      { id: 'subtitle', label: 'Subtitle' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Pricing,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    showToggle: {
      label: 'Monthly / yearly toggle',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    plans: {
      label: 'Plans',
      group: CONTENT,
      type: 'list',
      item: {
        name: { label: 'Name', group: CONTENT, type: 'text' },
        price: { label: 'Monthly price', group: CONTENT, type: 'text' },
        yearlyPrice: {
          label: 'Yearly price (optional)',
          group: CONTENT,
          type: 'text',
        },
        period: { label: 'Period label', group: CONTENT, type: 'text' },
        description: { label: 'Description', group: CONTENT, type: 'textarea' },
        features: {
          label: 'Features',
          group: CONTENT,
          type: 'list',
          item: { text: { label: 'Feature', group: CONTENT, type: 'text' } },
        },
        buttonText: { label: 'Button text', group: CONTENT, type: 'text' },
        buttonLink: {
          label: 'Button link',
          group: CONTENT,
          type: 'custom',
          render: UrlField,
        },
        popular: {
          label: 'Highlight as popular',
          group: CONTENT,
          type: 'radio',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      defaultItem: {
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
    },
    plan_title_style: elementStyle('planTitle', 'Plan Title Style', TEXT_PARTS),
    plan_price_style: elementStyle('planPrice', 'Plan Price Style', TEXT_PARTS),
    plan_btn_style: elementStyle('planButton', 'Plan Button Style', BUTTON_PARTS),
    popularLabel: { label: 'Popular badge text', group: CONTENT, type: 'text' },
    yearlyPeriodLabel: { label: 'Yearly period text', group: CONTENT, type: 'text' },
    ...cardFields(),
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
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
        features: [{ text: 'Unlimited sites' }, { text: 'Priority support' }],
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const TestimonialsBlock = defineBlock({
  type: 'Testimonials',
  label: 'Testimonials',
  category: 'marketing',
  icon: 'testimonials',
  reorder: {
    parts: [
      { id: 'quote', label: 'Quote' },
      { id: 'author', label: 'Author' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Testimonials,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    items: {
      label: 'Testimonials',
      group: CONTENT,
      type: 'list',
      item: {
        quote: { label: 'Quote', group: CONTENT, type: 'textarea' },
        author: { label: 'Author', group: CONTENT, type: 'text' },
        role: { label: 'Role', group: CONTENT, type: 'text' },
        company: { label: 'Company', group: CONTENT, type: 'text' },
        avatar: {
          label: 'Avatar',
          group: CONTENT,
          type: 'custom',
          render: MediaUrlField,
        },
      },
      defaultItem: {
        quote: 'A great product.',
        author: 'Name',
        role: '',
        company: '',
        avatar: '',
      },
    },
    quote_style: elementStyle('quote', 'Quote Style', TEXT_PARTS),
    author_style: elementStyle('author', 'Author Style', TEXT_PARTS),
    columns: columnsField('Columns', [1, 2, 3]),
    ...cardFields(),
    ...headingStyles({ subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const FAQBlock = defineBlock({
  type: 'FAQ',
  label: 'FAQ',
  category: 'marketing',
  icon: 'faq',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Faq,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    items: {
      label: 'Questions',
      group: CONTENT,
      type: 'list',
      item: {
        question: { label: 'Question', group: CONTENT, type: 'text' },
        answer: { label: 'Answer', group: CONTENT, type: 'textarea' },
      },
      defaultItem: { question: 'Question?', answer: 'Answer.' },
    },
    question_style: elementStyle('question', 'Question Style', TEXT_PARTS),
    answer_style: elementStyle('answer', 'Answer Style', TEXT_PARTS),
    ...headingStyles({ subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const CTABlock = defineBlock({
  type: 'CTA',
  label: 'Call to action',
  category: 'heroes',
  icon: 'cta',
  reorder: {
    parts: [
      { id: 'badge', label: 'Badge' },
      { id: 'title', label: 'Title' },
      { id: 'description', label: 'Description' },
      { id: 'buttons', label: 'Buttons' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Cta,
  fields: {
    badge: { label: 'Badge', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'textarea' },
    description: { label: 'Description', group: CONTENT, type: 'textarea' },
    primaryButtonText: {
      label: 'Primary button text',
      group: CONTENT,
      type: 'text',
    },
    primaryButtonLink: {
      label: 'Primary button link',
      group: CONTENT,
      type: 'custom',
      render: UrlField,
    },
    secondaryButtonText: {
      label: 'Secondary button text',
      group: CONTENT,
      type: 'text',
    },
    secondaryButtonLink: {
      label: 'Secondary button link',
      group: CONTENT,
      type: 'custom',
      render: UrlField,
    },
    variant: {
      label: 'Style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Gradient', value: 'gradient' },
        { label: 'Primary color', value: 'primary' },
        { label: 'Subtle', value: 'subtle' },
      ],
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    desc_style: elementStyle('description', 'Description Style', TEXT_PARTS),
    badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    primary_btn_style: elementStyle('primaryButton', 'Primary Button Style', BUTTON_PARTS),
    secondary_btn_style: elementStyle('secondaryButton', 'Secondary Button Style', BUTTON_PARTS),
    ...sectionControls(),
  },
  defaults: {
    badge: '',
    title: 'Ready to get started?',
    description: 'Join thousands of teams building faster.',
    primaryButtonText: 'Start now',
    primaryButtonLink: '#',
    secondaryButtonText: '',
    secondaryButtonLink: '',
    variant: 'gradient',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ColumnsBlock = defineBlock({
  type: 'Columns',
  label: 'Columns',
  category: 'layout',
  icon: 'columns',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Columns,
  fields: {
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '2 equal', value: '1-1' },
        { label: '3 equal', value: '1-1-1' },
        { label: '4 equal', value: '1-1-1-1' },
        { label: 'Wide + narrow', value: '2-1' },
        { label: 'Narrow + wide', value: '1-2' },
      ],
    },
    gap: {
      label: 'Gap',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    verticalAlign: {
      label: 'Vertical alignment',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Top', value: 'start' },
        { label: 'Center', value: 'center' },
        { label: 'Bottom', value: 'end' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    layout: '1-1',
    gap: 'md',
    verticalAlign: 'start',
    column1: [],
    column2: [],
    column3: [],
    column4: [],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
  slots: {
    column1: { allow: undefined, disallow: ['Columns', 'GlobalRef'] },
    column2: { allow: undefined, disallow: ['Columns', 'GlobalRef'] },
    column3: { allow: undefined, disallow: ['Columns', 'GlobalRef'] },
    column4: { allow: undefined, disallow: ['Columns', 'GlobalRef'] },
  },
});

export const ContainerBlock = defineBlock({
  type: 'Container',
  label: 'Container',
  category: 'layout',
  icon: 'container',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Container,
  fields: {
    container: {
      label: 'Container',
      group: CONTENT,
      tab: 'layout',
      section: 'Container Layout',
      type: 'custom',
      render: ContainerLayoutControl,
    },
    ...sectionControls({ omit: ['width'] }),
  },
  defaults: {
    container: {
      mode: 'flex',
      tag: 'div',
      direction: { desktop: 'row' },
      wrap: { desktop: 'nowrap' },
      justify: { desktop: 'start' },
      alignItems: { desktop: 'stretch' },
      alignContent: { desktop: 'start' },
      boxSizing: 'border-box',
    },
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
    content: [],
  },
  slots: { content: { allow: undefined, disallow: undefined } },
});

export const VideoBlock = defineBlock({
  type: 'Video',
  label: 'Video',
  category: 'content',
  icon: 'video',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Video,
  fields: {
    url: { label: 'Video URL', group: CONTENT, type: 'text' },
    ...sectionControls(),
  },
  defaults: {
    url: '',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const VideoLibraryNativeBlock = defineBlock({
  type: 'VideoLibrary',
  label: 'Video library',
  category: 'content',
  icon: 'videolibrary',
  schema: z.object({
    sources: z.array(z.enum(['youtube', 'vimeo', 'direct'])).optional(),
    source: z.union([
      z.enum(['all', 'youtube', 'vimeo', 'direct']),
      z.array(z.enum(['youtube', 'vimeo', 'direct'])),
    ]).optional(),
    showSearch: z.boolean().optional(),
    searchPlaceholder: z.string().optional(),
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: VideoLibraryBlock,
  fields: {
    sources: {
      label: 'Data sources',
      group: CONTENT,
      type: 'custom',
      render: VideoSourcesField,
    },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    description: { label: 'Description', group: CONTENT, type: 'textarea' },
    showSearch: {
      label: 'Show search bar',
      group: CONTENT,
      type: 'toggle',
    },
    searchPlaceholder: {
      label: 'Search placeholder',
      group: CONTENT,
      type: 'text',
      when: (props: any) => props.showSearch !== false,
    },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Sidebar', value: 'sidebar' },
        { label: 'Stacked', value: 'stacked' },
      ],
    },
    playlistId: {
      label: 'Playlist ID (optional)',
      group: CONTENT,
      type: 'text',
    },
    pageSize: {
      label: 'Videos per page',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 48,
    },
    ...sectionControls(),
  },
  defaults: {
    sources: ['youtube', 'vimeo', 'direct'],
    title: 'Videos',
    description: '',
    showSearch: true,
    searchPlaceholder: '',
    layout: 'sidebar',
    playlistId: '',
    pageSize: 12,
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const EmbedBlock = defineBlock({
  type: 'Embed',
  label: 'Embed',
  category: 'content',
  icon: 'embed',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Embed,
  fields: {
    url: { label: 'Embed URL', group: CONTENT, type: 'text' },
    ...sectionControls(),
  },
  defaults: {
    url: '',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const MapNativeBlock = defineBlock({
  type: 'Map',
  label: 'Map',
  category: 'content',
  icon: 'map',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: MapBlock,
  fields: {
    address: { label: 'Address', group: CONTENT, type: 'text' },
    ...sectionControls(),
  },
  defaults: {
    address: '',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const CodeBlock = defineBlock({
  type: 'Code',
  label: 'Code',
  category: 'content',
  icon: 'code',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Code,
  fields: {
    code: { label: 'Code', group: CONTENT, type: 'textarea' },
    filename: { label: 'File name', group: CONTENT, type: 'text' },
    showCopy: {
      label: 'Copy button',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    code: '',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const NewsletterBlock = defineBlock({
  type: 'Newsletter',
  label: 'Newsletter',
  category: 'content',
  icon: 'newsletter',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Newsletter,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    text: { label: 'Description', group: CONTENT, type: 'textarea' },
    subtitle: { label: 'Short text', group: CONTENT, type: 'text' },
    placeholder: { label: 'Email placeholder', group: CONTENT, type: 'text' },
    submitText: { label: 'Button text', group: CONTENT, type: 'text' },
    successMessage: { label: 'Success message', group: CONTENT, type: 'text' },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Centered', value: 'centered' },
        { label: 'Compact', value: 'compact' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    title: 'Newsletter',
    subtitle: '',
    email: '',
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ImageMorphBlock = defineBlock({
  type: 'ImageMorph',
  label: 'Image morph',
  category: 'layout',
  icon: 'imagemorph',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: ImageMorph,
  fields: {
    morph: {
      label: 'Morph',
      group: CONTENT,
      type: 'custom',
      render: ImageMorphField,
    },
    ...sectionControls(),
  },
  defaults: {
    morph: {
      effect: 'image',
      image: { url: '', opacity: 1, zoom: 1, posX: 50, posY: 50 },
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const RichTextBlock = defineBlock({
  type: 'RichText',
  label: 'Rich text',
  category: 'content',
  icon: 'richtext',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: RichText,
  fields: {
    content: {
      label: 'Content',
      group: CONTENT,
      type: 'custom',
      render: RichTextField,
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    content_style: elementStyle('content', 'Content Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    content: '<h2>Section heading</h2><p>Write your content here.</p>',
    width: 'normal',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ImageNativeBlock = defineBlock({
  type: 'Image',
  label: 'Image',
  category: 'content',
  icon: 'image',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
    imageSize: imageSizeSchema.optional(),
  }).passthrough(),
  render: ImageBlock,
  fields: {
    url: {
      label: 'Image',
      group: CONTENT,
      type: 'custom',
      render: MediaUrlField,
    },
    image_size: groupControl('imageSize', {
      label: 'Image Resolution',
      tab: 'content',
      section: 'Image',
      path: 'imageSize',
    }),
    alt: { label: 'Alt text', group: CONTENT, type: 'text' },
    caption: { label: 'Caption', group: CONTENT, type: 'text' },
    aspect: {
      label: 'Aspect ratio',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Original', value: 'auto' },
        { label: '16:9', value: 'video' },
        { label: 'Square', value: 'square' },
        { label: '21:9', value: 'wide' },
      ],
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
        { label: 'Full', value: 'full' },
      ],
    },
    imageWidth: {
      label: 'Image width (px)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 4000,
    },
    imageHeight: {
      label: 'Image height (px)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 4000,
    },
    objectFit: {
      label: 'Object fit',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
      ],
    },
    link: {
      label: 'Link (optional)',
      group: CONTENT,
      type: 'custom',
      render: UrlField,
    },
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS.filter(part => part !== 'imageSize')),
    caption_style: elementStyle('caption', 'Caption Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    url: '',
    alt: '',
    caption: '',
    aspect: 'auto',
    width: 'normal',
    objectFit: 'cover',
    link: '',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const GalleryBlock = defineBlock({
  type: 'Gallery',
  label: 'Gallery',
  category: 'content',
  icon: 'gallery',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Gallery,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    columns: {
      label: 'Columns',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    gap: {
      label: 'Gap',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    items: {
      label: 'Images',
      group: CONTENT,
      type: 'list',
      item: {
        url: {
          label: 'Image',
          group: CONTENT,
          type: 'custom',
          render: MediaUrlField,
        },
        alt: { label: 'Alt text', group: CONTENT, type: 'text' },
        caption: { label: 'Caption', group: CONTENT, type: 'text' },
      },
      defaultItem: { url: '', alt: '', caption: '' },
    },
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ContactFormBlock = defineBlock({
  type: 'ContactForm',
  label: 'Contact form',
  category: 'contact',
  icon: 'contactform',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: ContactForm,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    submitText: { label: 'Submit button', group: CONTENT, type: 'text' },
    successMessage: { label: 'Success message', group: CONTENT, type: 'text' },
    actionUrl: {
      label: 'Form action URL (optional)',
      group: CONTENT,
      type: 'text',
    },
    fields: {
      label: 'Fields',
      group: CONTENT,
      type: 'list',
      item: {
        label: { label: 'Label', group: CONTENT, type: 'text' },
        name: { label: 'Name', group: CONTENT, type: 'text' },
        type: {
          label: 'Type',
          group: CONTENT,
          type: 'select',
          options: [
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
          ],
        },
        placeholder: { label: 'Placeholder', group: CONTENT, type: 'text' },
        options: {
          label: 'Options, one per line',
          group: CONTENT,
          type: 'custom',
          render: ContactFormOptionsField,
        },
        required: {
          label: 'Required',
          group: CONTENT,
          type: 'radio',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      defaultItem: {
        label: 'Field',
        name: 'field',
        type: 'text',
        required: false,
        placeholder: '',
        options: '',
      },
    },
    ...headingStyles({ eyebrow: false }),
    ...sectionControls(),
  },
  defaults: {
    title: 'Contact us',
    subtitle: '',
    submitText: 'Send message',
    successMessage: 'Thanks! We will be in touch soon.',
    actionUrl: '',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true },
      { label: 'Email', name: 'email', type: 'email', required: true },
      { label: 'Message', name: 'message', type: 'textarea', required: true },
    ],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ButtonBlock = defineBlock({
  type: 'Button',
  label: 'Button',
  category: 'layout',
  icon: 'button',
  inlineProps: ['label'],
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Button,
  fields: {
    label: { label: 'Label', group: CONTENT, type: 'text' },
    link: { label: 'Link', group: CONTENT, type: 'custom', render: UrlField },
    alignment: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    variant: {
      label: 'Style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Soft', value: 'soft' },
      ],
    },
    size: {
      label: 'Size',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'S', value: 'sm' },
        { label: 'M', value: 'md' },
        { label: 'L', value: 'lg' },
      ],
    },
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    ...sectionControls(),
  },
  defaults: {
    label: 'Button',
    link: 'https://www.example.com/',
    alignment: 'center',
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const SpacerBlock = defineBlock({
  type: 'Spacer',
  label: 'Spacer',
  category: 'layout',
  icon: 'spacer',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Spacer,
  fields: {
    height: {
      label: 'Height (px)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 400,
    },
    ...sectionControls(),
  },
  defaults: {
    height: 96,
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

/** Label for a Collection item field row: its key, made readable. */
const fieldRowLabel = (item: Record<string, unknown>, index: number) => {
  const key = typeof item.field === 'string' ? item.field : '';
  if (!key) return `Field ${index + 1}`;
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
};

const styleControl = (parts: readonly ElementPart[]) =>
  ((props: any) =>
    ElementStyleControl({
      parts,
      value: props.value,
      onChange: props.onChange,
    })) as any;

export const CollectionItemBlock = defineBlock({
  type: 'CollectionItem',
  label: 'Collection item',
  category: 'collections',
  icon: 'collectionitem',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: CollectionItem as any,
  fields: {
    items: {
      label: 'Fields to display',
      group: CONTENT,
      type: 'list',
      itemLabel: fieldRowLabel,
      item: {
        field: {
          label: 'Field',
          group: CONTENT,
          type: 'custom',
          render: CollectionItemFieldSelect,
          single: true,
        },
        textSize: {
          label: 'Text size / Heading',
          group: CONTENT,
          type: 'select',
          options: [
            { label: 'Auto (Smart heading / text)', value: 'auto' },
            { label: 'Heading 1 (Hero Title)', value: 'h1' },
            { label: 'Heading 2 (Section Title)', value: 'h2' },
            { label: 'Heading 3 (Card Title)', value: 'h3' },
            { label: 'Lead (Large text)', value: 'lead' },
            { label: 'Body (Regular text)', value: 'body' },
            { label: 'Small', value: 'small' },
          ],
        },
        showLabel: {
          label: 'Show field label',
          group: CONTENT,
          type: 'toggle',
        },
        labelText: {
          label: 'Custom label (optional)',
          group: CONTENT,
          type: 'text',
          placeholder: 'Uses the field name',
          when: (item: any) => item.showLabel !== false,
        },
        style: {
          label: 'Value style',
          group: CONTENT,
          type: 'custom',
          render: styleControl(ALL_PARTS),
        },
        labelStyle: {
          label: 'Label style',
          group: CONTENT,
          type: 'custom',
          render: styleControl(TEXT_PARTS),
          when: (item: any) => item.showLabel !== false,
        },
      },
      defaultItem: {
        field: '',
        textSize: 'auto',
        showLabel: true,
        labelText: '',
        style: {},
        labelStyle: {},
      },
    },
    layout: {
      label: 'Container style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Card (Box with border & shadow)', value: 'card' },
        { label: 'Table (label / value rows)', value: 'table' },
        { label: 'Clean (Inline, no box)', value: 'clean' },
      ],
    },
    direction: {
      label: 'Arrange fields',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Stacked', value: 'stack' },
        { label: 'In a row', value: 'row' },
        { label: 'Two-column grid', value: 'grid' },
      ],
      when: (props: any) => (props.items?.length ?? 0) > 1,
    },
    gap: {
      label: 'Space between fields',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
      when: (props: any) => (props.items?.length ?? 0) > 1,
    },
    align: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    container_style: elementStyle('container', 'Container Style', BUTTON_PARTS),
    ...sectionControls(),
  },
  defaults: {
    items: [],
    layout: 'card',
    direction: 'stack',
    gap: 'md',
    align: 'left',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const GlobalRefBlock = defineBlock({
  type: 'GlobalRef',
  label: 'Global block',
  category: 'global',
  icon: 'globalref',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: GlobalRef,
  fields: {
    globalBlockId: {
      label: 'Block',
      group: CONTENT,
      type: 'custom',
      render: GlobalBlockSelectField,
    },
  },
  defaults: { globalBlockId: '' },
});

export const CollectionBlockDef = defineBlock({
  type: 'CollectionBlock',
  label: 'Collection block',
  category: 'collection-blocks',
  icon: 'collectionitem',
  schema: z.object({
    collectionBlockId: z.string().optional(),
  }).passthrough(),
  render: CollectionBlockRef,
  fields: {
    collectionBlockId: {
      label: 'Block',
      group: CONTENT,
      type: 'custom',
      render: CollectionBlockSelectField,
    },
  },
  defaults: { collectionBlockId: '' },
});

export const LogoCloudBlock = defineBlock({
  type: 'LogoCloud',
  label: 'Logo cloud',
  category: 'marketing',
  icon: 'logocloud',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
      { id: 'subtitle', label: 'Subtitle' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: LogoCloud,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    items: {
      label: 'Logos',
      group: CONTENT,
      type: 'list',
      item: {
        url: {
          label: 'Logo',
          group: CONTENT,
          type: 'custom',
          render: MediaUrlField,
        },
        alt: { label: 'Alt text', group: CONTENT, type: 'text' },
        link: {
          label: 'Link (optional)',
          group: CONTENT,
          type: 'custom',
          render: UrlField,
        },
      },
      defaultItem: { url: '', alt: '', link: '' },
    },
    grayscale: { label: 'Grey until hover', group: CONTENT, type: 'toggle' },
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
    eyebrow: '',
    title: 'Trusted by teams',
    subtitle: '',
    items: [],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const TeamBlock = defineBlock({
  type: 'Team',
  label: 'Team',
  category: 'marketing',
  icon: 'team',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Team,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    items: {
      label: 'Members',
      group: CONTENT,
      type: 'list',
      item: {
        photo: {
          label: 'Photo',
          group: CONTENT,
          type: 'custom',
          render: MediaUrlField,
        },
        name: { label: 'Name', group: CONTENT, type: 'text' },
        role: { label: 'Role', group: CONTENT, type: 'text' },
      },
      defaultItem: { photo: '', name: '', role: '' },
    },
    columns: columnsField('Columns (desktop)', [2, 3, 4]),
    ...cardFields(),
    ...headingStyles({ subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
    eyebrow: '',
    title: 'Meet the team',
    items: [],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const TimelineBlock = defineBlock({
  type: 'Timeline',
  label: 'Timeline',
  category: 'marketing',
  icon: 'timeline',
  reorder: {
    parts: [
      { id: 'eyebrow', label: 'Eyebrow' },
      { id: 'title', label: 'Title' },
    ],
  },
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Timeline,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    items: {
      label: 'Events',
      group: CONTENT,
      type: 'list',
      item: {
        date: { label: 'Date', group: CONTENT, type: 'text' },
        title: { label: 'Title', group: CONTENT, type: 'text' },
        body: { label: 'Body', group: CONTENT, type: 'textarea' },
      },
      defaultItem: { date: '', title: '', body: '' },
    },
    ...headingStyles({ subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
    eyebrow: '',
    title: 'Timeline',
    items: [],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const BlogPostsBlock = defineBlock({
  type: 'BlogPosts',
  label: 'Blog posts',
  category: 'blog',
  icon: 'blogposts',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: BlogPosts,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
      ],
    },
    columns: {
      label: 'Columns',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    pageSize: {
      label: 'Posts per page',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 48,
    },
    showSearch: {
      label: 'Search',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showCategoryFilter: {
      label: 'Category filter',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showTagFilter: {
      label: 'Tag filter',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showSort: {
      label: 'Sort',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showPagination: {
      label: 'Pagination',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showImage: {
      label: 'Card image',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showExcerpt: {
      label: 'Card excerpt',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showAuthor: {
      label: 'Card author',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showDate: {
      label: 'Card date',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    lockedCategory: {
      label: 'Category lock',
      group: CONTENT,
      type: 'custom',
      render: CategoryLockField,
    },
    lockedTag: {
      label: 'Tag lock',
      group: CONTENT,
      type: 'custom',
      render: TagLockField,
    },
    emptyMessage: { label: 'Empty message', group: CONTENT, type: 'text' },
    ...headingStyles({ eyebrow: false }),
    ...sectionControls(),
  },
  defaults: {
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
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const SliderBlock = defineBlock({
  type: 'Slider',
  label: 'Slider',
  category: 'layout',
  icon: 'slider',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Slider,
  fields: {
    items: {
      label: 'Slides',
      group: CONTENT,
      type: 'list',
      item: { title: { label: 'Title', group: CONTENT, type: 'text' } },
      defaultItem: { title: 'Slide', content: [] },
    },
    autoplay: { label: 'Autoplay', group: CONTENT, type: 'toggle' },
    autoplayInterval: {
      label: 'Autoplay every',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '3 seconds', value: 3 },
        { label: '5 seconds', value: 5 },
        { label: '7 seconds', value: 7 },
        { label: '10 seconds', value: 10 },
      ],
    },
    loop: { label: 'Loop slides', group: CONTENT, type: 'toggle' },
    showArrows: { label: 'Show arrows', group: CONTENT, type: 'toggle' },
    showDots: { label: 'Show dots', group: CONTENT, type: 'toggle' },
    ...sectionControls(),
  },
  defaults: {
    items: [{ title: 'Slide 1', content: [] }],
    showArrows: true,
    showDots: true,
    autoplayInterval: 5,
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const TabsBlock = defineBlock({
  type: 'Tabs',
  label: 'Tabs',
  category: 'layout',
  icon: 'tabs',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Tabs,
  fields: {
    items: {
      label: 'Tabs',
      group: CONTENT,
      type: 'list',
      item: { label: { label: 'Label', group: CONTENT, type: 'text' } },
      defaultItem: { label: 'Tab 1', content: [] },
    },
    variant: {
      label: 'Tab style',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Underline', value: 'underline' },
        { label: 'Pills', value: 'pills' },
      ],
    },
    alignment: {
      label: 'Tab alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'Center', value: 'center' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    items: [{ label: 'Tab 1', content: [] }],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const AccordionBlock = defineBlock({
  type: 'Accordion',
  label: 'Accordion',
  category: 'layout',
  icon: 'accordion',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Accordion,
  fields: {
    items: {
      label: 'Items',
      group: CONTENT,
      type: 'list',
      item: { title: { label: 'Title', group: CONTENT, type: 'text' } },
      defaultItem: { title: 'Question?', content: [] },
    },
    allowMultiple: {
      label: 'Allow several open at once',
      group: CONTENT,
      type: 'toggle',
    },
    ...sectionControls(),
  },
  defaults: {
    items: [{ title: 'Item 1', content: [] }],
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
  arraySlots: { items: { content: { allow: undefined, disallow: undefined } } },
});

export const PostTitleBlock = defineBlock({
  type: 'PostTitle',
  label: 'Post title',
  category: 'post',
  icon: 'posttitle',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: PostTitle,
  fields: {
    showBackLink: {
      label: 'Link back to the blog page',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showExcerpt: {
      label: 'Show excerpt',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    alignment: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Left', value: 'left' },
      ],
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    showBackLink: true,
    showExcerpt: true,
    alignment: 'left',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const PostFeaturedImageBlock = defineBlock({
  type: 'PostFeaturedImage',
  label: 'Featured image',
  category: 'post',
  icon: 'postfeaturedimage',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: PostFeaturedImage,
  fields: {
    aspect: {
      label: 'Aspect ratio',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Wide (21:9)', value: 'wide' },
        { label: 'Video (16:9)', value: 'video' },
        { label: 'Square', value: 'square' },
        { label: 'Original', value: 'auto' },
      ],
    },
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    ...sectionControls(),
  },
  defaults: {
    aspect: 'wide',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const PostMetaBlock = defineBlock({
  type: 'PostMeta',
  label: 'Post details',
  category: 'post',
  icon: 'postmeta',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: PostMeta,
  fields: {
    showAuthor: {
      label: 'Author',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showDate: {
      label: 'Date',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showCategories: {
      label: 'Categories',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showTags: {
      label: 'Tags',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    showAuthor: true,
    showDate: true,
    showCategories: true,
    showTags: true,
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const PostContentBlock = defineBlock({
  type: 'PostContent',
  label: 'Post content',
  category: 'post',
  icon: 'postcontent',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: PostContent,
  fields: {
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    content_style: elementStyle('content', 'Content Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    width: 'normal',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const RelatedPostsBlock = defineBlock({
  type: 'RelatedPosts',
  label: 'Related posts',
  category: 'post',
  icon: 'relatedposts',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: RelatedPosts,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    limit: {
      label: 'Number of posts',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 12,
    },
    columns: {
      label: 'Columns',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
    },
    showImage: {
      label: 'Card image',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showExcerpt: {
      label: 'Card excerpt',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showAuthor: {
      label: 'Card author',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showDate: {
      label: 'Card date',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    ...headingStyles({ eyebrow: false, subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
    title: 'Related posts',
    limit: 3,
    columns: 3,
    showImage: true,
    showExcerpt: true,
    showAuthor: false,
    showDate: true,
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const BookmarkButtonBlock = defineBlock({
  type: 'BookmarkButton',
  label: 'Bookmark button',
  category: 'post',
  icon: 'bookmarks',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: BookmarkButton,
  fields: {
    label: { label: 'Button text (empty = icon only)', group: CONTENT, type: 'text' },
    align: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    label: 'Save',
    align: 'left',
    width: 'normal',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const AudioBlock = defineBlock({
  type: 'Audio',
  label: 'Audio',
  category: 'content',
  icon: 'audio',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Audio,
  fields: {
    url: { label: 'Audio file URL (mp3, m4a, ogg)', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    caption: { label: 'Caption', group: CONTENT, type: 'text' },
    coverImage: {
      label: 'Cover image',
      group: CONTENT,
      type: 'custom',
      render: MediaUrlField,
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    url: '',
    title: 'Field recording',
    caption: '',
    width: 'normal',
    section: {
      paddingY: 'md',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const BookmarksBlock = defineBlock({
  type: 'Bookmarks',
  label: 'Bookmarks',
  category: 'header',
  icon: 'bookmarks',
  schema: z.object({
    title: z.string().max(60).optional(),
    emptyText: z.string().max(200).optional(),
  }).passthrough(),
  render: BookmarksDrawer,
  fields: {
    title: { label: 'Drawer title', type: 'text' },
    emptyText: { label: 'Empty message', type: 'textarea' },
  },
  defaults: {
    title: 'Saved',
    emptyText: 'Nothing saved yet. Use the bookmark button on a post to keep it here.',
  },
});

export const AuthorBioBlock = defineBlock({
  type: 'AuthorBio',
  label: 'Author bio',
  category: 'post',
  icon: 'authorbio',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: AuthorBio,
  fields: {
    heading: { label: 'Heading', group: CONTENT, type: 'text' },
    showAvatar: {
      label: 'Avatar',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    name_style: elementStyle('name', 'Name Style', TEXT_PARTS),
    bio_style: elementStyle('bio', 'Bio Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    heading: 'Written by',
    showAvatar: true,
    width: 'normal',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

const POST_SECTION_DEFAULT = {
  paddingY: 'sm' as const,
  background: 'default' as const,
  hideOnMobile: false,
  hideOnTablet: false,
  hideOnDesktop: false,
  anchor: '',
};

const WIDTH_FIELD = {
  label: 'Width',
  group: CONTENT,
  type: 'select' as const,
  options: [
    { label: 'Narrow', value: 'narrow' },
    { label: 'Normal', value: 'normal' },
    { label: 'Wide', value: 'wide' },
  ],
};

export const AuthorCardBlock = defineBlock({
  type: 'AuthorCard',
  label: 'Author card',
  category: 'post',
  icon: 'authorcard',
  schema: z.object({
    layout: z.enum(['horizontal', 'stacked']).optional(),
    latestCount: z.number().int().min(1).max(5).optional(),
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: AuthorCard,
  fields: {
    heading: { label: 'Heading', group: CONTENT, type: 'text' },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Side by side', value: 'horizontal' },
        { label: 'Stacked (centered)', value: 'stacked' },
      ],
    },
    showSocial: { label: 'Show website & social links', group: CONTENT, type: 'toggle' },
    showPostCount: { label: 'Show post count', group: CONTENT, type: 'toggle' },
    showLatestPosts: { label: 'Show latest posts', group: CONTENT, type: 'toggle' },
    latestCount: {
      label: 'Latest posts to show',
      group: CONTENT,
      type: 'select',
      options: [1, 2, 3, 4, 5].map(n => ({ label: String(n), value: n })),
      when: (p: any) => p.showLatestPosts !== false,
    },
    latestTitle: {
      label: 'Latest posts heading (blank = “More from <name>”)',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.showLatestPosts !== false,
    },
    viewAllLabel: { label: '“View all posts” label (blank hides it)', group: CONTENT, type: 'text' },
    width: WIDTH_FIELD,
    ...cardFields(),
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    name_style: elementStyle('name', 'Name Style', TEXT_PARTS),
    bio_style: elementStyle('bio', 'Bio Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    heading: 'About the author',
    layout: 'horizontal',
    showSocial: true,
    showPostCount: true,
    showLatestPosts: true,
    latestCount: 3,
    latestTitle: '',
    viewAllLabel: 'View all posts',
    width: 'normal',
    section: POST_SECTION_DEFAULT,
  },
});

export const CommentsBlock = defineBlock({
  type: 'Comments',
  label: 'Comments',
  category: 'post',
  icon: 'comments',
  schema: z.object({
    sort: z.enum(['oldest', 'newest']).optional(),
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: Comments,
  fields: {
    heading: { label: 'Heading', group: CONTENT, type: 'text' },
    sort: {
      label: 'Order',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Oldest first', value: 'oldest' },
        { label: 'Newest first', value: 'newest' },
      ],
    },
    showForm: { label: 'Show comment form', group: CONTENT, type: 'toggle' },
    formTitle: { label: 'Form title', group: CONTENT, type: 'text', when: (p: any) => p.showForm !== false },
    submitLabel: { label: 'Submit button label', group: CONTENT, type: 'text', when: (p: any) => p.showForm !== false },
    pendingMessage: { label: 'Message after posting', group: CONTENT, type: 'text', when: (p: any) => p.showForm !== false },
    emptyText: { label: 'Text when there are no comments', group: CONTENT, type: 'text' },
    closedText: { label: 'Text when comments are off (blank hides the block)', group: CONTENT, type: 'text' },
    width: WIDTH_FIELD,
    ...cardFields(),
    heading_style: elementStyle('heading', 'Heading Style', TEXT_PARTS),
    name_style: elementStyle('name', 'Commenter Name Style', TEXT_PARTS),
    body_style: elementStyle('body', 'Comment Text Style', TEXT_PARTS),
    ...sectionControls(),
  },
  defaults: {
    heading: 'Comments',
    sort: 'oldest',
    showForm: true,
    formTitle: 'Leave a comment',
    submitLabel: 'Post comment',
    pendingMessage: 'Thanks — your comment is awaiting moderation.',
    emptyText: 'No comments yet. Start the conversation.',
    closedText: 'Comments are closed.',
    width: 'normal',
    section: { ...POST_SECTION_DEFAULT, paddingY: 'md' },
  },
});

export const PostNavigationBlock = defineBlock({
  type: 'PostNavigation',
  label: 'Previous / next post',
  category: 'post',
  icon: 'postnavigation',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: PostNavigation,
  fields: {
    previousLabel: { label: 'Previous label', group: CONTENT, type: 'text' },
    nextLabel: { label: 'Next label', group: CONTENT, type: 'text' },
    scope: {
      label: 'Link to',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Any post / entry', value: 'all' },
        { label: 'Same category / term', value: 'same-term' },
      ],
    },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Cards', value: 'split' },
        { label: 'Minimal row', value: 'minimal' },
      ],
    },
    showImage: { label: 'Show image', group: CONTENT, type: 'toggle', when: (p: any) => p.layout !== 'minimal' },
    showDate: { label: 'Show date', group: CONTENT, type: 'toggle' },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    previousLabel: 'Previous',
    nextLabel: 'Next',
    scope: 'all',
    layout: 'split',
    showImage: false,
    showDate: false,
    width: 'normal',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

export const ShareButtonsBlock = defineBlock({
  type: 'ShareButtons',
  label: 'Share buttons',
  category: 'post',
  icon: 'share-2',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: ShareButtons,
  fields: {
    label: { label: 'Label', group: CONTENT, type: 'text' },
    networks: {
      label: 'Networks',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Copy, X, LinkedIn, Email', value: 'default' },
        { label: 'All (+ Facebook)', value: 'all' },
        { label: 'Copy link only', value: 'copy' },
      ],
    },
    align: {
      label: 'Alignment',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    width: {
      label: 'Width',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    label: 'Share',
    networks: 'default',
    align: 'left',
    width: 'normal',
    section: {
      paddingY: 'sm',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
});

/** Width / size / align fields for one header column (HeaderBar custom layout, HeaderColumns). */
const headerColumnFields = (
  prefix: string,
  label: string,
  defaults: { width: 'auto' | 'fill' | 'custom'; align: 'start' | 'center' | 'end' },
  visible: (props: any) => boolean
) => ({
  [`${prefix}Width`]: {
    label: `${label} width`,
    type: 'select' as const,
    options: [
      { label: 'Fit content', value: 'auto' },
      { label: 'Fill remaining space', value: 'fill' },
      { label: 'Custom size', value: 'custom' },
    ],
    when: visible,
  },
  [`${prefix}Size`]: {
    label: `${label} size (e.g. 240px, 30%, 2fr)`,
    type: 'text' as const,
    when: (props: any) =>
      visible(props) && (props[`${prefix}Width`] ?? defaults.width) === 'custom',
  },
  [`${prefix}Align`]: {
    label: `${label} alignment`,
    type: 'radio' as const,
    options: [
      { label: 'Start', value: 'start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'end' },
    ],
    when: visible,
  },
});

const headerColWidthSchema = z.enum(['auto', 'fill', 'custom']).optional();
const headerColAlignSchema = z.enum(['start', 'center', 'end']).optional();
const headerColSizeSchema = z.string().max(24).optional();

export const HeaderBarBlock = defineBlock({
  type: 'HeaderBar',
  label: 'Header bar',
  category: 'header',
  icon: 'layout',
  schema: z.object({
    width: z.enum(['boxed', 'full']).default('boxed'),
    background: z
      .enum(['default', 'muted', 'inverted', 'primary', 'transparent'])
      .default('default'),
    paddingY: z.enum(['none', 'xs', 'sm', 'md', 'lg']).default('sm'),
    layout: z
      .enum([
        'left-center-right',
        'split-2',
        'equal-3',
        'left-heavy',
        'right-heavy',
        'custom',
      ])
      .default('left-center-right'),
    leftWidth: headerColWidthSchema,
    leftSize: headerColSizeSchema,
    leftAlign: headerColAlignSchema,
    centerWidth: headerColWidthSchema,
    centerSize: headerColSizeSchema,
    centerAlign: headerColAlignSchema,
    rightWidth: headerColWidthSchema,
    rightSize: headerColSizeSchema,
    rightAlign: headerColAlignSchema,
    stackOn: z.enum(['none', 'mobile', 'tablet']).optional(),
    minHeight: z.string().default(''),
    borderBottom: z.boolean().default(false),
    align: z.enum(['center', 'start', 'end']).default('center'),
  }),
  slots: {
    left: { label: 'Left slot' },
    center: { label: 'Center slot' },
    right: { label: 'Right slot' },
  },
  render: HeaderBar,
  fields: {
    width: {
      label: 'Width',
      type: 'radio',
      options: [
        { label: 'Boxed', value: 'boxed' },
        { label: 'Full', value: 'full' },
      ],
    },
    layout: {
      label: 'Column layout',
      type: 'select',
      options: [
        {
          label: '3 columns (Left / Center / Right)',
          value: 'left-center-right',
        },
        { label: '2 columns (Left / Right split)', value: 'split-2' },
        { label: '3 equal columns (33% / 33% / 33%)', value: 'equal-3' },
        { label: 'Left heavy (50% / 25% / 25%)', value: 'left-heavy' },
        { label: 'Right heavy (25% / 25% / 50%)', value: 'right-heavy' },
        { label: 'Custom widths (set each column)', value: 'custom' },
      ],
    },
    ...headerColumnFields('left', 'Left column', { width: 'auto', align: 'start' }, (p: any) => p.layout === 'custom'),
    ...headerColumnFields('center', 'Center column', { width: 'fill', align: 'center' }, (p: any) => p.layout === 'custom'),
    ...headerColumnFields('right', 'Right column', { width: 'auto', align: 'end' }, (p: any) => p.layout === 'custom'),
    stackOn: {
      label: 'Stack columns on',
      type: 'radio',
      options: [
        { label: 'Never', value: 'none' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Tablet', value: 'tablet' },
      ],
      when: (p: any) => p.layout === 'custom',
    },
    background: {
      label: 'Background',
      type: 'select',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Surface / Muted', value: 'muted' },
        { label: 'Inverted', value: 'inverted' },
        { label: 'Primary', value: 'primary' },
        { label: 'Transparent', value: 'transparent' },
      ],
    },
    paddingY: {
      label: 'Vertical padding',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Extra small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    minHeight: { label: 'Minimum height (CSS)', type: 'text' },
    borderBottom: {
      label: 'Bottom border',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    align: {
      label: 'Vertical alignment',
      type: 'radio',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
      ],
    },
  },
  defaults: {
    width: 'boxed',
    background: 'default',
    paddingY: 'sm',
    layout: 'left-center-right',
    minHeight: '',
    borderBottom: false,
    align: 'center',
  },
});

export const HeaderColumnsBlock = defineBlock({
  type: 'HeaderColumns',
  label: 'Header columns',
  category: 'header',
  icon: 'columns',
  schema: z.object({
    width: z.enum(['boxed', 'full']).default('boxed'),
    background: z
      .enum(['default', 'muted', 'inverted', 'primary', 'transparent'])
      .default('default'),
    paddingY: z.enum(['none', 'xs', 'sm', 'md', 'lg']).default('none'),
    columns: z.number().min(1).max(6).default(3),
    gap: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
    align: z.enum(['center', 'start', 'end']).default('center'),
    stackOn: z.enum(['mobile', 'tablet']).default('mobile'),    col1Width: headerColWidthSchema,
    col1Size: headerColSizeSchema,
    col1Align: headerColAlignSchema,
    col2Width: headerColWidthSchema,
    col2Size: headerColSizeSchema,
    col2Align: headerColAlignSchema,
    col3Width: headerColWidthSchema,
    col3Size: headerColSizeSchema,
    col3Align: headerColAlignSchema,
    col4Width: headerColWidthSchema,
    col4Size: headerColSizeSchema,
    col4Align: headerColAlignSchema,
    col5Width: headerColWidthSchema,
    col5Size: headerColSizeSchema,
    col5Align: headerColAlignSchema,
    col6Width: headerColWidthSchema,
    col6Size: headerColSizeSchema,
    col6Align: headerColAlignSchema,
  }),
  slots: {
    col1: { label: 'Column 1' },
    col2: { label: 'Column 2' },
    col3: { label: 'Column 3' },
    col4: { label: 'Column 4' },
    col5: { label: 'Column 5' },
    col6: { label: 'Column 6' },
  },
  render: HeaderColumns,
  fields: {
    width: {
      label: 'Width',
      type: 'radio',
      options: [
        { label: 'Boxed', value: 'boxed' },
        { label: 'Full', value: 'full' },
      ],
    },
    background: {
      label: 'Background',
      type: 'select',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Surface / Muted', value: 'muted' },
        { label: 'Inverted', value: 'inverted' },
        { label: 'Primary', value: 'primary' },
        { label: 'Transparent', value: 'transparent' },
      ],
    },
    paddingY: {
      label: 'Vertical padding',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Extra small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    columns: {
      label: 'Number of columns',
      type: 'select',
      options: [
        { label: '1 column', value: 1 },
        { label: '2 columns', value: 2 },
        { label: '3 columns', value: 3 },
        { label: '4 columns', value: 4 },
        { label: '5 columns', value: 5 },
        { label: '6 columns', value: 6 },
      ],
    },
    gap: {
      label: 'Gap between columns',
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra large', value: 'xl' },
      ],
    },
    align: {
      label: 'Vertical alignment',
      type: 'radio',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
      ],
    },
    stackOn: {
      label: 'Stack on',
      type: 'radio',
      options: [
        { label: 'Mobile (< 768px)', value: 'mobile' },
        { label: 'Tablet (< 1024px)', value: 'tablet' },
      ],
    },
    ...headerColumnFields('col1', 'Column 1', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 1),
    ...headerColumnFields('col2', 'Column 2', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 2),
    ...headerColumnFields('col3', 'Column 3', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 3),
    ...headerColumnFields('col4', 'Column 4', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 4),
    ...headerColumnFields('col5', 'Column 5', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 5),
    ...headerColumnFields('col6', 'Column 6', { width: 'fill', align: 'start' }, (p: any) => (Number(p.columns) || 3) >= 6),
  },
  defaults: {
    width: 'boxed',
    background: 'default',
    paddingY: 'none',
    columns: 3,
    gap: 'md',
    align: 'center',
    stackOn: 'mobile',
  },
});

export const FooterColumnsBlock = defineBlock({
  type: 'FooterColumns',
  label: 'Footer columns',
  category: 'footer',
  icon: 'columns',
  schema: z.object({
    width: z.enum(['boxed', 'full']).default('boxed'),
    background: z
      .enum(['default', 'muted', 'inverted', 'primary'])
      .default('default'),
    paddingY: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('lg'),
    columns: z.number().min(1).max(6).default(4),
    gap: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
    stackOn: z.enum(['mobile', 'tablet']).default('mobile'),
  }),
  slots: {
    col1: { label: 'Column 1' },
    col2: { label: 'Column 2' },
    col3: { label: 'Column 3' },
    col4: { label: 'Column 4' },
    col5: { label: 'Column 5' },
    col6: { label: 'Column 6' },
  },
  render: FooterColumns,
  fields: {
    width: {
      label: 'Width',
      type: 'radio',
      options: [
        { label: 'Boxed', value: 'boxed' },
        { label: 'Full', value: 'full' },
      ],
    },
    background: {
      label: 'Background',
      type: 'select',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Surface / Muted', value: 'muted' },
        { label: 'Inverted', value: 'inverted' },
        { label: 'Primary', value: 'primary' },
      ],
    },
    paddingY: {
      label: 'Vertical padding',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra large', value: 'xl' },
      ],
    },
    columns: {
      label: 'Columns',
      type: 'select',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
        { label: '5 Columns', value: 5 },
        { label: '6 Columns', value: 6 },
      ],
    },
    gap: {
      label: 'Gap',
      type: 'radio',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra large', value: 'xl' },
      ],
    },
    stackOn: {
      label: 'Stack on',
      type: 'radio',
      options: [
        { label: 'Mobile (< 768px)', value: 'mobile' },
        { label: 'Tablet (< 1024px)', value: 'tablet' },
      ],
    },
  },
  defaults: {
    width: 'boxed',
    background: 'default',
    paddingY: 'lg',
    columns: 4,
    gap: 'lg',
    stackOn: 'mobile',
  },
});

export const LogoBlock = defineBlock({
  type: 'Logo',
  label: 'Logo',
  category: 'header',
  icon: 'image',
  schema: z.object({
    source: z.enum(['site', 'media']).default('site'),
    mediaUrl: z.string().default(''),
    darkMediaUrl: z.string().default(''),
    /** Removed control; kept so older saves still validate. */
    stickyMediaUrl: z.string().optional(),
    width: z.number().default(140),
    link: z.string().default('/'),
    showSiteName: z.boolean().default(true),
    tagline: z.string().max(120).optional(),
  }),
  render: Logo,
  fields: {
    source: {
      label: 'Source',
      type: 'radio',
      options: [
        { label: 'Site settings', value: 'site' },
        { label: 'Custom media', value: 'media' },
      ],
    },
    mediaUrl: {
      label: 'Logo image',
      type: 'custom',
      render: MediaUrlField,
      when: (props: any) => props.source === 'media',
    },
    darkMediaUrl: {
      label: 'Dark mode logo (optional)',
      type: 'custom',
      render: MediaUrlField,
    },
    width: { label: 'Width (px)', type: 'number' },
    link: { label: 'Link URL', type: 'custom', render: UrlField },
    showSiteName: {
      label: 'Show site name text',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    tagline: {
      label: 'Tagline (under the name)',
      type: 'text',
      when: (props: any) => props.showSiteName !== false,
    },
  },
  defaults: {
    source: 'site',
    mediaUrl: '',
    darkMediaUrl: '',
    width: 140,
    link: '/',
    showSiteName: true,
  },
});

export const NavMenuBlock = defineBlock({
  type: 'NavMenu',
  label: 'Navigation menu',
  category: 'header',
  icon: 'menu',
  schema: z.object({
    location: z.enum(['header', 'footer']).default('header'),
    orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
    depth: z.number().min(1).max(3).default(2),
    dropdownTrigger: z.enum(['hover', 'click']).default('hover'),
    gap: z.enum(['sm', 'md', 'lg']).default('md'),
    activeStyle: z
      .enum(['underline', 'pill', 'bold', 'none'])
      .default('underline'),
  }),
  render: NavMenu,
  fields: {
    location: {
      label: 'Menu location',
      type: 'select',
      options: [
        { label: 'Header menu', value: 'header' },
        { label: 'Footer menu', value: 'footer' },
      ],
    },
    orientation: {
      label: 'Orientation',
      type: 'radio',
      options: [
        { label: 'Horizontal', value: 'horizontal' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    depth: {
      label: 'Dropdown depth',
      type: 'select',
      options: [
        { label: '1 level (flat)', value: 1 },
        { label: '2 levels (dropdowns)', value: 2 },
        { label: '3 levels (nested)', value: 3 },
      ],
    },
    dropdownTrigger: {
      label: 'Dropdown trigger',
      type: 'radio',
      options: [
        { label: 'Hover', value: 'hover' },
        { label: 'Click', value: 'click' },
      ],
    },
    gap: {
      label: 'Spacing',
      type: 'radio',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    activeStyle: {
      label: 'Active item style',
      type: 'select',
      options: [
        { label: 'Underline', value: 'underline' },
        { label: 'Pill badge', value: 'pill' },
        { label: 'Bold font', value: 'bold' },
        { label: 'None', value: 'none' },
      ],
    },
  },
  defaults: {
    location: 'header',
    orientation: 'horizontal',
    depth: 2,
    dropdownTrigger: 'hover',
    gap: 'md',
    activeStyle: 'underline',
  },
});

export const CopyrightBlock = defineBlock({
  type: 'Copyright',
  label: 'Copyright notice',
  category: 'footer',
  icon: 'text',
  schema: z.object({
    text: z.string().default('© {year} {site_name}. All rights reserved.'),
    align: z.enum(['left', 'center', 'right']).default('center'),
  }),
  render: Copyright,
  fields: {
    text: { label: 'Copyright text', type: 'text' },
    align: {
      label: 'Alignment',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
  },
  defaults: {
    text: '© {year} {site_name}. All rights reserved.',
    align: 'center',
  },
});

export const FooterLinksBlock = defineBlock({
  type: 'FooterLinks',
  label: 'Footer links',
  category: 'footer',
  icon: 'list',
  schema: z.object({
    heading: z.string().default('Quick links'),
    source: z.enum(['menu', 'manual']).default('manual'),
    menuLocation: z.enum(['header', 'footer']).default('footer'),
    collapseOnMobile: z.boolean().default(false),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
          target: z.string().optional(),
        })
      )
      .default([]),
  }),
  render: FooterLinks,
  fields: {
    heading: { label: 'Column heading', type: 'text' },
    source: {
      label: 'Link source',
      type: 'radio',
      options: [
        { label: 'Manual list', value: 'manual' },
        { label: 'Menu location', value: 'menu' },
      ],
    },
    menuLocation: {
      label: 'Menu location',
      type: 'select',
      options: [
        { label: 'Footer menu', value: 'footer' },
        { label: 'Header menu', value: 'header' },
      ],
      when: (props: any) => props.source === 'menu',
    },
    links: {
      label: 'Links',
      type: 'list',
      when: (props: any) => props.source === 'manual',
      item: {
        label: { label: 'Label', type: 'text' },
        url: { label: 'URL', type: 'custom', render: UrlField },
      },
      defaultItem: { label: 'Link', url: '#' },
    },
    collapseOnMobile: {
      label: 'Collapse on mobile',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaults: {
    heading: 'Quick links',
    source: 'manual',
    menuLocation: 'footer',
    collapseOnMobile: false,
    links: [
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Contact Support', url: '/contact' },
    ],
  },
});

export const MobileMenuBlock = defineBlock({
  type: 'MobileMenu',
  label: 'Mobile menu',
  category: 'header',
  icon: 'menu',
  schema: z.object({
    breakpoint: z.enum(['mobile', 'tablet']).default('mobile'),
    drawerSide: z.enum(['left', 'right', 'full']).default('right'),
    menuLocation: z.enum(['header', 'footer']).default('header'),
    icon: z.enum(['menu', 'dots']).default('menu'),
    showSearch: z.boolean().default(false),
  }),
  render: MobileMenu,
  fields: {
    breakpoint: {
      label: 'Visible on',
      type: 'radio',
      options: [
        { label: 'Mobile only (< 768px)', value: 'mobile' },
        { label: 'Mobile & Tablet (< 1024px)', value: 'tablet' },
      ],
    },
    drawerSide: {
      label: 'Drawer position',
      type: 'radio',
      options: [
        { label: 'Right', value: 'right' },
        { label: 'Left', value: 'left' },
        { label: 'Full screen', value: 'full' },
      ],
    },
    menuLocation: {
      label: 'Menu location',
      type: 'select',
      options: [
        { label: 'Header menu', value: 'header' },
        { label: 'Footer menu', value: 'footer' },
      ],
    },
    icon: {
      label: 'Button icon',
      type: 'radio',
      options: [
        { label: 'Hamburger', value: 'menu' },
        { label: 'Three dots', value: 'dots' },
      ],
    },
    showSearch: {
      label: 'Show search in drawer',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaults: {
    breakpoint: 'mobile',
    drawerSide: 'right',
    menuLocation: 'header',
    icon: 'menu',
    showSearch: false,
  },
});

export const SearchBoxBlock = defineBlock({
  type: 'SearchBox',
  label: 'Search box',
  category: 'header',
  icon: 'search',
  schema: z.object({
    mode: z.enum(['inline', 'icon-modal']).default('inline'),
    placeholder: z.string().default('Search...'),
    liveResults: z.boolean().default(true),
    align: z.enum(['left', 'right']).default('right'),
  }),
  render: SearchBox,
  fields: {
    mode: {
      label: 'Display mode',
      type: 'radio',
      options: [
        { label: 'Inline input', value: 'inline' },
        { label: 'Icon button (modal)', value: 'icon-modal' },
      ],
    },
    placeholder: {
      label: 'Placeholder text',
      type: 'text',
    },
    liveResults: {
      label: 'Live search results dropdown',
      type: 'toggle',
    },
    align: {
      label: 'Dropdown alignment',
      type: 'radio',
      options: [
        { label: 'Right aligned', value: 'right' },
        { label: 'Left aligned', value: 'left' },
      ],
    },
  },
  defaults: {
    mode: 'inline',
    placeholder: 'Search...',
    liveResults: true,
    align: 'right',
  },
});

export const AnnouncementBarBlock = defineBlock({
  type: 'AnnouncementBar',
  label: 'Announcement bar',
  category: 'header',
  icon: 'bell',
  schema: z.object({
    text: z.string().default('Welcome to our newly designed website!'),
    link: z.string().default(''),
    dismissible: z.boolean().default(true),
    dismissDays: z.number().default(7),
    startsAt: z.string().default(''),
    endsAt: z.string().default(''),
  }),
  render: AnnouncementBar,
  fields: {
    text: { label: 'Announcement text', type: 'textarea' },
    link: { label: 'Link URL (optional)', type: 'custom', render: UrlField },
    dismissible: {
      label: 'Dismissible',
      type: 'radio',
      options: [
        { label: 'Yes (close button)', value: true },
        { label: 'No (always show)', value: false },
      ],
    },
    dismissDays: {
      label: 'Hide for (days after dismiss)',
      type: 'number',
    },
    startsAt: {
      label: 'Start time (optional ISO format)',
      type: 'text',
    },
    endsAt: {
      label: 'End time (optional ISO format)',
      type: 'text',
    },
  },
  defaults: {
    text: 'Welcome to our newly designed website!',
    link: '',
    dismissible: true,
    dismissDays: 7,
    startsAt: '',
    endsAt: '',
  },
});

export const SocialIconsBlock = defineBlock({
  type: 'SocialIcons',
  label: 'Social icons',
  category: 'footer',
  icon: 'share-2',
  schema: z.object({
    shape: z.enum(['plain', 'round', 'square']).default('plain'),
    size: z.enum(['sm', 'md', 'lg']).default('md'),
    align: z.enum(['left', 'center', 'right']).default('left'),
    items: z
      .array(
        z.object({
          network: z.string(),
          url: z.string(),
          label: z.string().optional(),
        })
      )
      .default([
        { network: 'x', url: 'https://x.com', label: 'X' },
        { network: 'github', url: 'https://github.com', label: 'GitHub' },
        { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
      ]),
  }),
  render: SocialIcons,
  fields: {
    shape: {
      label: 'Icon shape',
      type: 'radio',
      options: [
        { label: 'Plain', value: 'plain' },
        { label: 'Round', value: 'round' },
        { label: 'Square', value: 'square' },
      ],
    },
    size: {
      label: 'Icon size',
      type: 'radio',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    align: {
      label: 'Alignment',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    items: {
      label: 'Networks',
      type: 'list',
      item: {
        network: {
          label: 'Network',
          type: 'select',
          options: [
            { label: 'X (Twitter)', value: 'x' },
            { label: 'GitHub', value: 'github' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Discord', value: 'discord' },
            { label: 'TikTok', value: 'tiktok' },
          ],
        },
        url: { label: 'Profile URL', type: 'custom', render: UrlField },
        label: { label: 'Accessible label', type: 'text' },
      },
      defaultItem: { network: 'x', url: 'https://x.com', label: 'X' },
    },
  },
  defaults: {
    shape: 'plain',
    size: 'md',
    align: 'left',
    items: [
      { network: 'x', url: 'https://x.com', label: 'X' },
      { network: 'github', url: 'https://github.com', label: 'GitHub' },
      { network: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
    ],
  },
});

export const ContactInfoBlock = defineBlock({
  type: 'ContactInfo',
  label: 'Contact info',
  category: 'footer',
  icon: 'phone',
  schema: z.object({
    showIcons: z.boolean().default(true),
    layout: z.enum(['vertical', 'horizontal']).default('vertical'),
    align: z.enum(['left', 'center', 'right']).default('left'),
    items: z
      .array(
        z.object({
          kind: z.enum(['address', 'phone', 'email']),
          value: z.string(),
          label: z.string().optional(),
        })
      )
      .default([
        { kind: 'email', value: 'contact@example.com', label: 'Email' },
        { kind: 'phone', value: '+1 (555) 000-0000', label: 'Phone' },
      ]),
  }),
  render: ContactInfo,
  fields: {
    showIcons: {
      label: 'Show icons',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    layout: {
      label: 'Layout',
      type: 'radio',
      options: [
        { label: 'Vertical', value: 'vertical' },
        { label: 'Horizontal', value: 'horizontal' },
      ],
    },
    align: {
      label: 'Alignment',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    items: {
      label: 'Contact items',
      type: 'list',
      item: {
        kind: {
          label: 'Type',
          type: 'select',
          options: [
            { label: 'Email address', value: 'email' },
            { label: 'Phone number', value: 'phone' },
            { label: 'Physical address', value: 'address' },
          ],
        },
        value: { label: 'Value', type: 'text' },
        label: { label: 'Label (optional)', type: 'text' },
      },
      defaultItem: {
        kind: 'email',
        value: 'hello@example.com',
        label: 'Email',
      },
    },
  },
  defaults: {
    showIcons: true,
    layout: 'vertical',
    align: 'left',
    items: [
      { kind: 'email', value: 'contact@example.com', label: 'Email' },
      { kind: 'phone', value: '+1 (555) 000-0000', label: 'Phone' },
    ],
  },
});

export const LegalLinksBlock = defineBlock({
  type: 'LegalLinks',
  label: 'Legal links',
  category: 'footer',
  icon: 'file-text',
  schema: z.object({
    source: z.enum(['menu', 'manual']).default('manual'),
    menuLocation: z.enum(['header', 'footer']).default('footer'),
    separator: z.enum(['dot', 'pipe', 'dash', 'none']).default('dot'),
    align: z.enum(['left', 'center', 'right']).default('center'),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
          target: z.string().optional(),
        })
      )
      .default([
        { label: 'Privacy Policy', url: '/privacy' },
        { label: 'Terms of Service', url: '/terms' },
        { label: 'Cookie Settings', url: '/cookies' },
      ]),
  }),
  render: LegalLinks,
  fields: {
    source: {
      label: 'Link source',
      type: 'radio',
      options: [
        { label: 'Manual list', value: 'manual' },
        { label: 'Menu location', value: 'menu' },
      ],
    },
    menuLocation: {
      label: 'Menu location',
      type: 'select',
      options: [
        { label: 'Footer menu', value: 'footer' },
        { label: 'Header menu', value: 'header' },
      ],
      when: (props: any) => props.source === 'menu',
    },
    separator: {
      label: 'Separator style',
      type: 'select',
      options: [
        { label: 'Dot ( · )', value: 'dot' },
        { label: 'Pipe ( | )', value: 'pipe' },
        { label: 'Dash ( – )', value: 'dash' },
        { label: 'None (space only)', value: 'none' },
      ],
    },
    align: {
      label: 'Alignment',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    links: {
      label: 'Links',
      type: 'list',
      when: (props: any) => props.source === 'manual',
      item: {
        label: { label: 'Label', type: 'text' },
        url: { label: 'URL', type: 'custom', render: UrlField },
      },
      defaultItem: { label: 'Link', url: '#' },
    },
  },
  defaults: {
    source: 'manual',
    menuLocation: 'footer',
    separator: 'dot',
    align: 'center',
    links: [
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Cookie Settings', url: '/cookies' },
    ],
  },
});

export const BackToTopBlock = defineBlock({
  type: 'BackToTop',
  label: 'Back to top',
  category: 'footer',
  icon: 'arrow-up',
  schema: z.object({
    position: z
      .enum(['bottom-right', 'bottom-left', 'inline'])
      .default('bottom-right'),
    showAfter: z.number().default(300),
    icon: z.enum(['arrow', 'chevron']).default('arrow'),
    label: z.string().default(''),
  }),
  render: BackToTop,
  fields: {
    position: {
      label: 'Button placement',
      type: 'select',
      options: [
        { label: 'Fixed bottom right', value: 'bottom-right' },
        { label: 'Fixed bottom left', value: 'bottom-left' },
        { label: 'Inline (in-flow)', value: 'inline' },
      ],
    },
    showAfter: {
      label: 'Show after scroll (px)',
      type: 'number',
    },
    icon: {
      label: 'Icon style',
      type: 'radio',
      options: [
        { label: 'Arrow', value: 'arrow' },
        { label: 'Chevron', value: 'chevron' },
      ],
    },
    label: {
      label: 'Button label (optional)',
      type: 'text',
    },
  },
  defaults: {
    position: 'bottom-right',
    showAfter: 300,
    icon: 'arrow',
    label: '',
  },
});

export const ThemeToggleBlock = defineBlock({
  type: 'ThemeToggle',
  label: 'Theme toggle',
  category: 'header',
  icon: 'sun',
  schema: z.object({
    /** Removed control (it never changed the icon); kept so older saves validate. */
    icon: z.enum(['sun-moon', 'circle']).optional(),
  }),
  render: ThemeToggle,
  fields: {},
  defaults: {},
});

export const LanguageSwitcherNativeBlock = defineBlock({
  type: 'LanguageSwitcher',
  label: 'Language switcher',
  category: 'header',
  icon: 'globe',
  schema: z.object({
    section: sectionSettingsSchema.optional(),
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }).passthrough(),
  render: LanguageSwitcherBlock,
  fields: {},
  defaults: {},
});

export const PostTypeEntriesBlock = defineBlock({
  type: 'PostTypeEntries',
  label: 'Post type entries',
  category: 'collections',
  icon: 'collectionitem',
  schema: z
    .object({
      collectionId: z.string().optional(),
      /** Fallback used by presets: the post type with this slug on the site. */
      postTypeSlug: z.string().optional(),
      display: z
        .enum(['cards', 'team', 'testimonials', 'testimonial-slider', 'faq'])
        .default('cards'),
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(12),
      sortOrder: z.enum(['oldest', 'newest']).default('oldest'),
      linkToEntry: z.boolean().default(false),
      emptyText: z.string().default('Nothing to show yet.'),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: PostTypeEntries as any,
  presets: {
    'Team grid': {
      postTypeSlug: 'team',
      display: 'team',
      eyebrow: 'Our people',
      title: 'Meet the team',
    },
    'Testimonial slider': {
      postTypeSlug: 'testimonials',
      display: 'testimonial-slider',
      eyebrow: 'Testimonials',
      title: 'What our customers say',
    },
    'FAQ list': {
      postTypeSlug: 'faq',
      display: 'faq',
      title: 'Frequently asked questions',
    },
  },
  fields: {
    collectionId: {
      label: 'Post type',
      group: CONTENT,
      type: 'custom',
      render: CollectionSelectField,
    },
    display: {
      label: 'Display as',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Cards', value: 'cards' },
        { label: 'Team grid', value: 'team' },
        { label: 'Testimonial grid', value: 'testimonials' },
        { label: 'Testimonial slider', value: 'testimonial-slider' },
        { label: 'FAQ accordion', value: 'faq' },
      ],
    },
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Heading', group: CONTENT, type: 'text' },
    limit: {
      label: 'Number of entries (max 100)',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 100,
    },
    sortOrder: {
      label: 'Order',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Oldest first', value: 'oldest' },
        { label: 'Newest first', value: 'newest' },
      ],
    },
    linkToEntry: {
      label: 'Link cards to the entry page',
      group: CONTENT,
      type: 'toggle',
      when: (props: any) => (props.display ?? 'cards') === 'cards',
    },
    emptyText: { label: 'Empty state text', group: CONTENT, type: 'text' },
    ...headingStyles({ subtitle: false }),
    ...sectionControls(),
  },
  defaults: {
    collectionId: '',
    postTypeSlug: '',
    display: 'cards',
    eyebrow: '',
    title: '',
    limit: 12,
    sortOrder: 'oldest',
    linkToEntry: false,
    emptyText: 'Nothing to show yet.',
    section: DEFAULT_SECTION,
  },
});

export const QueryLoopBlock = defineBlock({
  type: 'QueryLoop',
  label: 'Query Loop',
  category: 'blog',
  icon: 'layout-grid',
  inlineProps: ['eyebrow', 'title', 'subtitle'],
  schema: z
    .object({
      loopId: z.string().default(''),
      source: z
        .enum(['posts', 'pages', 'collection-entries', 'videos'])
        .default('posts'),
      collectionId: z.string().optional(),
      playlistId: z.string().optional(),
      lockedCategory: z.string().optional(),
      lockedTag: z.string().optional(),
      lockedTerm: z.string().optional(),
      lockedAuthorId: z.string().optional(),
      sortField: z.string().default('publishedAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      pageSize: z.number().int().min(1).max(100).default(9),
      offset: z.number().int().min(0).default(0),
      excludeCurrent: z.boolean().default(false),
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      layout: z
        .enum(['grid', 'list', 'masonry', 'carousel', 'table', 'featured'])
        .default('grid'),
      columnsDesktop: z.number().int().min(1).max(4).default(3),
      columnsTablet: z.number().int().min(1).max(3).default(2),
      columnsMobile: z.number().int().min(1).max(2).default(1),
      gap: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
      pagination: z
        .enum(['numbered', 'load-more', 'infinite-scroll', 'none'])
        .default('numbered'),
      loadMoreLabel: z.string().default('Load more'),
      showImage: z.boolean().default(true),
      showExcerpt: z.boolean().default(true),
      showAuthor: z.boolean().default(true),
      showDate: z.boolean().default(true),
      showTerms: z.boolean().default(true),
      emptyText: z.string().default('No matching items found.'),
      filterPosition: z.enum(['none', 'top', 'left', 'right']).default('none'),
      filterSticky: z.boolean().optional(),
      ...prefixedFilterSchema(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: QueryLoop as any,
  slots: {
    card: {
      label: 'Item Card Template',
      disallow: ['QueryLoop', 'GlobalRef'],
    },
    emptyState: {
      label: 'Empty State',
      disallow: ['QueryLoop', 'GlobalRef'],
    },
  },
  presets: {
    'Latest posts': {
      source: 'posts',
      title: 'Latest posts',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 6,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'numbered',
    },
    'Related posts': {
      source: 'posts',
      title: 'Related posts',
      excludeCurrent: true,
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 3,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'none',
    },
    'Collection entries': {
      source: 'collection-entries',
      title: 'Collection items',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 9,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'numbered',
    },
    Videos: {
      source: 'videos',
      title: 'Featured videos',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 6,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'load-more',
    },
  },
  fields: {
    loopId: {
      label: 'Loop ID (for linking filter blocks & URL params)',
      group: CONTENT,
      type: 'text',
    },
    source: {
      label: 'Content source',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Blog posts', value: 'posts' },
        { label: 'Pages', value: 'pages' },
        { label: 'Collection entries', value: 'collection-entries' },
        { label: 'Videos', value: 'videos' },
      ],
    },
    collectionId: {
      label: 'Collection',
      group: CONTENT,
      type: 'custom',
      render: CollectionSelectField,
      when: (props: any) => props.source === 'collection-entries',
    },
    playlistId: {
      label: 'Playlist ID (optional)',
      group: CONTENT,
      type: 'text',
      when: (props: any) => props.source === 'videos',
    },
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Heading', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subheading', group: CONTENT, type: 'textarea' },
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
        { label: 'Masonry', value: 'masonry' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Table', value: 'table' },
        { label: 'Featured (lead + grid)', value: 'featured' },
      ],
    },
    columnsDesktop: {
      label: 'Columns',
      group: CONTENT,
      type: 'custom',
      render: ResponsiveColumnsField,
      options: [
        { label: '1 column', value: 1 },
        { label: '2 columns', value: 2 },
        { label: '3 columns', value: 3 },
        { label: '4 columns', value: 4 },
      ],
    },
    columnsTablet: {
      label: 'Columns',
      group: CONTENT,
      type: 'custom',
      render: ResponsiveColumnsField,
      options: [
        { label: '1 column', value: 1 },
        { label: '2 columns', value: 2 },
        { label: '3 columns', value: 3 },
      ],
    },
    columnsMobile: {
      label: 'Columns',
      group: CONTENT,
      type: 'custom',
      render: ResponsiveColumnsField,
      options: [
        { label: '1 column', value: 1 },
        { label: '2 columns', value: 2 },
      ],
    },
    gap: {
      label: 'Grid gap',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra large', value: 'xl' },
      ],
    },
    pageSize: {
      label: 'Items per page (max 100)',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 100,
    },
    offset: {
      label: 'Offset (skip first items)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 100,
    },
    sortField: {
      label: 'Sort field',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Published date', value: 'publishedAt' },
        { label: 'Title', value: 'title' },
        { label: 'Created date', value: 'createdAt' },
        { label: 'Updated date', value: 'updatedAt' },
        { label: 'Playlist position', value: 'position' },
        { label: 'Video duration', value: 'duration' },
      ],
    },
    sortOrder: {
      label: 'Sort order',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Descending', value: 'desc' },
        { label: 'Ascending', value: 'asc' },
      ],
    },
    excludeCurrent: {
      label: 'Exclude current page/post',
      group: CONTENT,
      type: 'toggle',
    },
    lockedCategory: {
      label: 'Lock to category (slug or ID)',
      group: CONTENT,
      type: 'custom',
      render: CategoryLockField,
    },
    lockedTag: {
      label: 'Lock to tag (slug or ID)',
      group: CONTENT,
      type: 'custom',
      render: TagLockField,
    },
    lockedTerm: {
      label: 'Lock to term (post types)',
      group: CONTENT,
      type: 'custom',
      render: CptTermLockField,
      when: (props: any) => props.source === 'collection-entries',
    },
    pagination: {
      label: 'Pagination style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Numbered pages', value: 'numbered' },
        { label: 'Load more button', value: 'load-more' },
        { label: 'Infinite scroll', value: 'infinite-scroll' },
        { label: 'None', value: 'none' },
      ],
    },
    loadMoreLabel: {
      label: 'Load more button label',
      group: CONTENT,
      type: 'text',
      when: (props: any) => props.pagination === 'load-more',
    },
    showImage: { label: 'Show featured image', group: CONTENT, type: 'toggle' },
    showExcerpt: { label: 'Show excerpt', group: CONTENT, type: 'toggle' },
    showAuthor: { label: 'Show author', group: CONTENT, type: 'toggle' },
    showDate: { label: 'Show published date', group: CONTENT, type: 'toggle' },
    showTerms: { label: 'Show categories/tags', group: CONTENT, type: 'toggle' },
    emptyText: { label: 'Empty state text', group: CONTENT, type: 'text' },
    filterPosition: {
      label: 'Filters',
      group: 'Filters',
      type: 'select',
      options: [
        { label: 'Off', value: 'none' },
        { label: 'Top (above results)', value: 'top' },
        { label: 'Left sidebar', value: 'left' },
        { label: 'Right sidebar', value: 'right' },
      ],
    },
    filterSticky: {
      label: 'Keep sidebar in view while scrolling',
      group: 'Filters',
      type: 'toggle',
      when: (props: any) =>
        props.filterPosition === 'left' || props.filterPosition === 'right',
    },
    ...prefixedFilterFields(
      (props: any) => Boolean(props.filterPosition) && props.filterPosition !== 'none'
    ),
    ...cardFields(),
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
    loopId: '',
    source: 'posts',
    sortField: 'publishedAt',
    sortOrder: 'desc',
    pageSize: 9,
    offset: 0,
    excludeCurrent: false,
    eyebrow: '',
    title: 'Latest posts',
    subtitle: '',
    layout: 'grid',
    columnsDesktop: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: 'md',
    pagination: 'numbered',
    loadMoreLabel: 'Load more',
    showImage: true,
    showExcerpt: true,
    showAuthor: true,
    showDate: true,
    showTerms: true,
    emptyText: 'No matching items found.',
    filterPosition: 'none',
    card: [],
    emptyState: [],
    section: DEFAULT_SECTION,
  },
});

const qlf = QueryLoopBlock.fields as Record<string, any>;
const isCollectionGrid = (props: any) => props.source === 'collection-entries';

/**
 * Loop Grid: Elementor-style Loop Builder. Repeats a saved Loop Item
 * template over blog posts or one post type's entries.
 */
export const LoopGridBlock = defineBlock({
  type: 'LoopGrid',
  label: 'Loop Grid',
  category: 'blog',
  icon: 'layout-grid',
  inlineProps: ['eyebrow', 'title', 'subtitle'],
  schema: z
    .object({
      loopId: z.string().default(''),
      source: z.enum(['posts', 'collection-entries']).default('posts'),
      collectionId: z.string().optional(),
      templateId: z.string().optional(),
      lockedCategory: z.string().optional(),
      lockedTag: z.string().optional(),
      lockedTerm: z.string().optional(),
      lockedAuthorId: z.string().optional(),
      fieldFilters: z
        .array(
          z.object({
            key: z.string(),
            operator: z.string(),
            value: z.unknown().optional(),
          })
        )
        .optional(),
      sortField: z.string().default('publishedAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      pageSize: z.number().int().min(1).max(100).default(9),
      offset: z.number().int().min(0).default(0),
      excludeCurrent: z.boolean().default(false),
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      layout: z.enum(['grid', 'list', 'masonry', 'carousel', 'featured']).default('grid'),
      columnsDesktop: z.number().int().min(1).max(4).default(3),
      columnsTablet: z.number().int().min(1).max(3).default(2),
      columnsMobile: z.number().int().min(1).max(2).default(1),
      gap: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
      equalHeight: z.boolean().default(true),
      pagination: z
        .enum(['numbered', 'load-more', 'infinite-scroll', 'none'])
        .default('numbered'),
      loadMoreLabel: z.string().default('Load more'),
      emptyText: z.string().default('No matching items found.'),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: LoopGrid as any,
  slots: {
    emptyState: {
      label: 'Empty State',
      disallow: ['QueryLoop', 'LoopGrid', 'GlobalRef'],
    },
  },
  presets: {
    'Blog grid': {
      source: 'posts',
      title: 'Latest posts',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 6,
      pagination: 'numbered',
    },
    'Post type grid': {
      source: 'collection-entries',
      title: '',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 9,
      pagination: 'numbered',
    },
  },
  fields: {
    source: {
      label: 'Source',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Blog posts', value: 'posts' },
        { label: 'Custom post type', value: 'collection-entries' },
      ],
    },
    collectionId: {
      label: 'Post type',
      group: CONTENT,
      type: 'custom',
      render: CollectionSelectField,
      when: isCollectionGrid,
    },
    templateId: {
      label: 'Loop Item template',
      group: CONTENT,
      type: 'custom',
      render: LoopTemplatePickerField,
    },
    eyebrow: qlf.eyebrow,
    title: qlf.title,
    subtitle: qlf.subtitle,
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
        { label: 'Masonry', value: 'masonry' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Featured (lead + grid)', value: 'featured' },
      ],
    },
    columnsDesktop: qlf.columnsDesktop,
    columnsTablet: qlf.columnsTablet,
    columnsMobile: qlf.columnsMobile,
    gap: qlf.gap,
    equalHeight: { label: 'Equal height items', group: CONTENT, type: 'toggle' },
    pageSize: qlf.pageSize,
    offset: {
      label: 'Offset (skip first items)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 100,
    },
    sortField: {
      label: 'Order by',
      group: CONTENT,
      type: 'custom',
      render: LoopSortField,
    },
    sortOrder: qlf.sortOrder,
    lockedCategory: {
      ...qlf.lockedCategory,
      when: (props: any) => !isCollectionGrid(props),
    },
    lockedTag: {
      ...qlf.lockedTag,
      when: (props: any) => !isCollectionGrid(props),
    },
    fieldFilters: {
      label: 'Field filters',
      group: CONTENT,
      type: 'custom',
      render: CptFieldFiltersField,
      when: isCollectionGrid,
    },
    lockedTerm: {
      label: 'Lock to term',
      group: CONTENT,
      type: 'custom',
      render: CptTermLockField,
      when: isCollectionGrid,
    },
    excludeCurrent: qlf.excludeCurrent,
    loopId: qlf.loopId,
    pagination: qlf.pagination,
    loadMoreLabel: qlf.loadMoreLabel,
    emptyText: qlf.emptyText,
    ...cardFields(),
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
    loopId: '',
    source: 'posts',
    sortField: 'publishedAt',
    sortOrder: 'desc',
    pageSize: 9,
    offset: 0,
    excludeCurrent: false,
    fieldFilters: [],
    eyebrow: '',
    title: '',
    subtitle: '',
    layout: 'grid',
    columnsDesktop: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: 'md',
    equalHeight: true,
    pagination: 'numbered',
    loadMoreLabel: 'Load more',
    emptyText: 'No matching items found.',
    emptyState: [],
    section: DEFAULT_SECTION,
  },
});

export const LoopItemFieldBlock = defineBlock({
  type: 'LoopItemField',
  label: 'Loop Item Field',
  category: 'blog',
  icon: 'file-text',
  schema: z
    .object({
      field: z
        .enum([
          'title',
          'excerpt',
          'image',
          'publishedAt',
          'author',
          'terms',
          'readMore',
          'bookmark',
          'custom',
        ])
        .default('title'),
      customKey: z.string().default(''),
      linkToItem: z.boolean().default(true),
      readMoreLabel: z.string().default('Read more'),
    })
    .passthrough(),
  render: LoopItemField,
  fields: {
    field: {
      label: 'Item field',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Title', value: 'title' },
        { label: 'Excerpt / Summary', value: 'excerpt' },
        { label: 'Featured Image', value: 'image' },
        { label: 'Published Date', value: 'publishedAt' },
        { label: 'Author Name', value: 'author' },
        { label: 'Categories & Tags', value: 'terms' },
        { label: 'Read More Link', value: 'readMore' },
        { label: 'Bookmark Button', value: 'bookmark' },
        { label: 'Custom / Collection Field', value: 'custom' },
      ],
    },
    customKey: {
      label: 'Custom field',
      group: CONTENT,
      type: 'custom',
      render: LoopCustomKeyField,
      when: (props: any) => props.field === 'custom',
    },
    linkToItem: {
      label: 'Link to item URL',
      group: CONTENT,
      type: 'toggle',
    },
    readMoreLabel: {
      label: 'Read more label',
      group: CONTENT,
      type: 'text',
      when: (props: any) => props.field === 'readMore',
    },
  },
  defaults: {
    field: 'title',
    customKey: '',
    linkToItem: true,
    readMoreLabel: 'Read more',
  },
});

export const QueryFilterBlock = defineBlock({
  type: 'QueryFilter',
  label: 'Query Filter',
  category: 'blog',
  icon: 'filter',
  schema: z
    .object({
      targetLoopId: z.string().default(''),
      source: z
        .enum(['posts', 'pages', 'collection-entries', 'videos'])
        .default('posts'),
      collectionId: z.string().optional(),
      ...FILTER_OPTION_SCHEMA,
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: QueryFilter as any,
  fields: {
    targetLoopId: {
      label: 'Target Query Loop ID (leave blank for default loop)',
      group: CONTENT,
      type: 'text',
    },
    source: {
      label: 'Content source (match the target loop)',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Blog posts', value: 'posts' },
        { label: 'Pages', value: 'pages' },
        { label: 'Collection entries', value: 'collection-entries' },
        { label: 'Videos', value: 'videos' },
      ],
    },
    collectionId: {
      label: 'Collection',
      group: CONTENT,
      type: 'custom',
      render: CollectionSelectField,
      when: (props: any) => props.source === 'collection-entries',
    },
    ...FILTER_OPTION_FIELDS,
    ...sectionControls(),
  },
  defaults: {
    targetLoopId: '',
    source: 'posts',
    collectionId: '',
    ...FILTER_OPTION_DEFAULTS,
    section: DEFAULT_SECTION,
  },
});

export const SearchResultsBlock = defineBlock({
  type: 'SearchResults',
  label: 'Search Results',
  category: 'blog',
  icon: 'search',
  inlineProps: ['eyebrow', 'title', 'subtitle'],
  schema: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().default('Search'),
      subtitle: z.string().optional(),
      placeholder: z
        .string()
        .default('Search pages, posts, collections, and videos…'),
      showTabs: z.boolean().default(true),
      showThumbnails: z.boolean().default(true),
      showTypeBadges: z.boolean().default(true),
      showSnippets: z.boolean().default(true),
      pageSize: z.number().int().min(1).max(100).default(20),
      emptyText: z.string().default('No matching results found.'),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: SearchResults as any,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Heading', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subheading', group: CONTENT, type: 'textarea' },
    placeholder: { label: 'Search input placeholder', group: CONTENT, type: 'text' },
    showTabs: { label: 'Show content type tabs', group: CONTENT, type: 'toggle' },
    showThumbnails: { label: 'Show thumbnails', group: CONTENT, type: 'toggle' },
    showTypeBadges: { label: 'Show type badges', group: CONTENT, type: 'toggle' },
    showSnippets: { label: 'Show highlighted snippets', group: CONTENT, type: 'toggle' },
    pageSize: {
      label: 'Results per page',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 100,
    },
    emptyText: { label: 'Empty state text', group: CONTENT, type: 'text' },
    ...headingStyles(),
    ...sectionControls(),
  },
  defaults: {
    eyebrow: '',
    title: 'Search',
    subtitle: '',
    placeholder: 'Search pages, posts, collections, and videos…',
    showTabs: true,
    showThumbnails: true,
    showTypeBadges: true,
    showSnippets: true,
    pageSize: 20,
    emptyText: 'No matching results found.',
    section: DEFAULT_SECTION,
  },
});

export const MegaMenuCardBlock = defineBlock({
  type: 'MegaMenuCard',
  label: 'Featured card',
  category: 'megamenu',
  icon: 'image',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
  render: MegaMenuCard,
  fields: {
    layout: {
      label: 'Layout',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Image on top', value: 'stacked' },
        { label: 'Text over image', value: 'overlay' },
        { label: 'Image beside text', value: 'side' },
      ],
    },
    imageUrl: {
      label: 'Image',
      group: CONTENT,
      type: 'custom',
      render: MediaUrlField,
    },
    imageAlt: { label: 'Image alt text', group: CONTENT, type: 'text' },
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    text: { label: 'Text', group: CONTENT, type: 'textarea' },
    linkLabel: { label: 'Link text', group: CONTENT, type: 'text' },
    link: { label: 'Link', group: CONTENT, type: 'custom', render: UrlField },
    ...sectionControls(),
  },
  defaults: {
    layout: 'stacked',
    eyebrow: 'New',
    title: 'Featured product',
    text: 'A short line about what makes it worth a click.',
    linkLabel: 'Learn more',
    link: '/',
    section: { ...DEFAULT_SECTION, paddingY: 'none' },
  },
});

export const NATIVE_BLOCKS = [
  exampleBlock,
  MegaMenuCardBlock,
  HeroBlock,
  FeaturesBlock,
  StatsBlock,
  PricingBlock,
  TestimonialsBlock,
  FAQBlock,
  CTABlock,
  ColumnsBlock,
  ContainerBlock,
  VideoBlock,
  VideoLibraryNativeBlock,
  EmbedBlock,
  MapNativeBlock,
  CodeBlock,
  NewsletterBlock,
  ImageMorphBlock,
  RichTextBlock,
  ImageNativeBlock,
  GalleryBlock,
  ContactFormBlock,
  ButtonBlock,
  SpacerBlock,
  CollectionItemBlock,
  PostTypeEntriesBlock,
  GlobalRefBlock,
  CollectionBlockDef,
  LogoCloudBlock,
  TeamBlock,
  TimelineBlock,
  BlogPostsBlock,
  SliderBlock,
  TabsBlock,
  AccordionBlock,
  PostTitleBlock,
  PostFeaturedImageBlock,
  PostMetaBlock,
  PostContentBlock,
  RelatedPostsBlock,
  AuthorBioBlock,
  AuthorCardBlock,
  CommentsBlock,
  PostNavigationBlock,
  ShareButtonsBlock,
  BookmarkButtonBlock,
  AudioBlock,
  BookmarksBlock,
  HeaderBarBlock,
  HeaderColumnsBlock,
  FooterColumnsBlock,
  LogoBlock,
  NavMenuBlock,
  CopyrightBlock,
  FooterLinksBlock,
  MobileMenuBlock,
  SearchBoxBlock,
  AnnouncementBarBlock,
  SocialIconsBlock,
  ContactInfoBlock,
  LegalLinksBlock,
  BackToTopBlock,
  ThemeToggleBlock,
  LanguageSwitcherNativeBlock,
  QueryLoopBlock,
  LoopGridBlock,
  LoopItemFieldBlock,
  QueryFilterBlock,
  SearchResultsBlock,
];
export const PAGE_ROOT_FIELDS = {
  maxWidth: {
    type: 'select',
    label: 'Content width',
    group: 'Page',
    options: [
      { label: 'Narrow (768px)', value: 'md' },
      { label: 'Medium (1024px)', value: 'lg' },
      { label: 'Wide (1152px)', value: 'xl' },
      { label: 'Full width', value: 'full' },
    ],
  },
  theme: {
    type: 'select',
    label: 'Color mode',
    group: 'Page',
    options: [
      { label: 'Follow site settings', value: 'site' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ],
  },
  paddingY: {
    type: 'select',
    label: 'Page padding',
    group: 'Page',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ],
  },
  pageTransition: {
    type: 'custom',
    label: 'Page transition',
    group: 'Page',
    render: PageTransitionField,
  },
} as any;

export const HEADER_ROOT_FIELDS = {
  style: {
    type: 'custom',
    label: 'Header style',
    tab: 'style',
    section: 'Header Style',
    group: STYLE,
    render: HeaderStyleField,
  },
  sticky: {
    type: 'select',
    label: 'Sticky header',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
    options: [
      { label: 'Off', value: 'off' },
      { label: 'Always sticky', value: 'always' },
      { label: 'Reveal on scroll up', value: 'scroll-up' },
    ],
  },
  transparent: {
    type: 'radio',
    label: 'Transparent on load',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
    options: [
      { label: 'Solid', value: false },
      { label: 'Transparent', value: true },
    ],
  },
  shrinkOnScroll: {
    type: 'radio',
    label: 'Shrink logo on scroll',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
    options: [
      { label: 'No', value: false },
      { label: 'Yes', value: true },
    ],
  },
  hideOnScrollDown: {
    type: 'radio',
    label: 'Hide on scroll down',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
    options: [
      { label: 'No', value: false },
      { label: 'Yes', value: true },
    ],
  },
  shadow: {
    type: 'select',
    label: 'Shadow',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Show on scroll', value: 'on-scroll' },
      { label: 'Always', value: 'always' },
    ],
  },
  zIndex: {
    type: 'number',
    label: 'Z-Index layer',
    tab: 'advanced',
    section: 'Header Behaviour',
    group: 'Header Behaviour',
  },
} as any;

export const FOOTER_ROOT_FIELDS = {
  style: {
    type: 'custom',
    label: 'Footer style',
    tab: 'style',
    section: 'Footer Style',
    group: STYLE,
    render: FooterStyleField,
  },
} as any;

export const CATEGORIES = {
  header: {
    title: 'Header',
    components: [
      'HeaderBar',
      'HeaderColumns',
      'Logo',
      'NavMenu',
      'MobileMenu',
      'SearchBox',
      'AnnouncementBar',
      'SocialIcons',
      'ContactInfo',
      'ThemeToggle',
      'Bookmarks',
      'LanguageSwitcher',
      'Button',
      'Spacer',
    ],
  },
  footer: {
    title: 'Footer',
    components: [
      'FooterColumns',
      'FooterLinks',
      'SocialIcons',
      'ContactInfo',
      'Copyright',
      'LegalLinks',
      'BackToTop',
      'ThemeToggle',
      'Logo',
      'RichText',
      'Newsletter',
      'Spacer',
    ],
  },
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
      'VideoLibrary',
      'Embed',
      'Map',
      'Code',
      'Audio',
      'Newsletter',
    ],
  },
  contact: { title: 'Contact form', components: ['ContactForm'] },
  blog: {
    title: 'Blog & Listings',
    components: [
      'LoopGrid',
      'QueryLoop',
      'QueryFilter',
      'LoopItemField',
      'SearchResults',
      'BlogPosts',
    ],
  },
  layout: {
    title: 'Layout',
    components: [
      'Container',
      'Columns',
      'Slider',
      'Tabs',
      'Accordion',
      'Button',
      'Spacer',
    ],
  },
  collections: {
    title: 'Post types',
    components: ['PostTypeEntries', 'CollectionItem'],
  },
  'collection-blocks': {
    title: 'Collection blocks',
    components: ['CollectionBlock'],
  },
  global: { title: 'Global blocks', components: ['GlobalRef'] },
  /** Only the mega menu builder lists this group. */
  megamenu: { title: 'Mega menu', components: ['MegaMenuCard'] },
  custom: { title: 'Custom', components: ['example'] },
  post: {
    title: 'Post',
    components: [
      'PostTitle',
      'PostFeaturedImage',
      'PostMeta',
      'PostContent',
      'AuthorBio',
      'AuthorCard',
      'ShareButtons',
      'BookmarkButton',
      'PostNavigation',
      'Comments',
      'RelatedPosts',
    ],
  },
} as any;
