/**
 * Native blocks (ported from Puck config).
 */

import { defineBlock, responsive } from '@nextcms/builder-core';
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
  Column,
  Columns,
  ContactForm,
  Embed,
  Gallery,
  GlobalRef,
  ImageBlock,
  RichText,
  Video,
} from '../blocks/content';
import { SIZE_RE } from '../blocks/header-grid';
import { CollectionBlockRef } from '../blocks/collection-block';
import { ResponsiveColumnsField } from '../fields/responsive-columns-field';
import { ImageMorph } from '../blocks/image-morph';
import { Accordion, Slider, Tabs } from '../blocks/interactive';
import { Button, Spacer } from '../blocks/layout';
import {
  Icon,
  IconBox,
  ImageBox,
  ProgressBar,
  StarRating,
} from '../blocks/basic';
import { Counter } from '../blocks/counter-client';
import { Countdown } from '../blocks/countdown-client';
import { FlipBox } from '../blocks/flip-box';
import { AnimatedHeadline } from '../blocks/animated-headline-client';
import { PriceList, TestimonialCarousel } from '../blocks/marketing';
import { TableOfContents } from '../blocks/toc-client';
import { Breadcrumbs } from '../blocks/breadcrumbs';
import { Hotspot } from '../blocks/hotspot-client';
import { Lottie } from '../blocks/lottie-client';
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
import { Divider, Heading, OverlayClose } from '../blocks/overlay';
import { LightboxImage } from '../blocks/lightbox-client';
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
import { OverlayPickerField } from '../controls/overlay-picker';
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
  PlainUrlField,
  RichTextField,
  TagLockField,
  UrlField,
  VideoSourcesField,
} from '../fields/client-fields';
import { ContactFormOptionsField } from '../fields/contact-form-options-field';
import {
  type ElementPart,
  ElementStyleControl,
} from '../controls/element-style';
import {
  CONTENT,
  iconField,
  mediaField,
  STYLE,
  ALL_PARTS,
  BUTTON_PARTS,
  cardStyles,
  contentFields,
  contentSectionControls,
  elementStyle,
  FIELD_PARTS,
  headingStyles,
  cardFields,
  columnsField,
  groupControl,
  MEDIA_PARTS,
  overlayTriggerFields,
  sectionControls,
  sliderFields,
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Example,
  fields: {
    heading: { label: 'Heading', group: CONTENT, type: 'text' },
    body: { label: 'Body', group: CONTENT, type: 'textarea' },
    heading_style: elementStyle('heading', 'Heading Style', TEXT_PARTS),
    body_style: elementStyle('body', 'Body Style', TEXT_PARTS),
    ...contentSectionControls(),
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
    primaryButtonLink: z
      .union([urlSchema, z.record(z.string(), z.unknown())])
      .optional(),
    secondaryButtonText: z.string().optional(),
    secondaryButtonLink: z
      .union([urlSchema, z.record(z.string(), z.unknown())])
      .optional(),
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
    primary_btn_style: elementStyle(
      'primaryButton',
      'Primary Button Style',
      BUTTON_PARTS
    ),
    secondary_btn_style: elementStyle(
      'secondaryButton',
      'Secondary Button Style',
      BUTTON_PARTS
    ),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    ...contentSectionControls({ keepDisplay: true }),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        ...overlayTriggerFields(),
      },
      defaultItem: {
        icon: 'Sparkles',
        title: 'Feature',
        description: 'Describe the benefit.',
      },
    },
    item_title_style: elementStyle('itemTitle', 'Item Title Style', TEXT_PARTS),
    item_desc_style: elementStyle(
      'itemDescription',
      'Item Description Style',
      TEXT_PARTS
    ),
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS, {
      when: (p: any) => p.showIcons !== false,
    }),
    showIcons: { label: 'Show icons', group: CONTENT, type: 'toggle' },
    ...cardFields(),
    ...headingStyles(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    headline_style: elementStyle('headline', 'Headline Style', TEXT_PARTS, {
      when: (p: any) => Boolean(p.headline),
    }),
    change_style: elementStyle('change', 'Note Style', TEXT_PARTS),
    columns: columnsField('Columns (desktop)', [2, 3, 4]),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    plan_btn_style: elementStyle(
      'planButton',
      'Plan Button Style',
      BUTTON_PARTS
    ),
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    description_style: elementStyle(
      'description',
      'Description Style',
      TEXT_PARTS
    ),
    period_style: elementStyle('period', 'Period Style', TEXT_PARTS),
    feature_style: elementStyle('feature', 'Feature Style', TEXT_PARTS),
    toggle_style: elementStyle('toggle', 'Billing Toggle Style', BUTTON_PARTS, {
      when: (p: any) => p.showToggle === true,
    }),
    popularLabel: { label: 'Popular badge text', group: CONTENT, type: 'text' },
    yearlyPeriodLabel: {
      label: 'Yearly period text',
      group: CONTENT,
      type: 'text',
    },
    ...cardFields(),
    ...headingStyles(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        ...overlayTriggerFields(),
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
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    quote_icon_style: elementStyle('quoteIcon', 'Quote Icon Style', [
      'color',
    ] as const),
    avatar_style: elementStyle('avatar', 'Avatar Style', MEDIA_PARTS),
    role_style: elementStyle('role', 'Role Style', TEXT_PARTS),
    columns: { ...columnsField('Columns', [1, 2, 3]), when: (p: any) => !p.slider },
    ...sliderFields({ desktop: 2, tablet: 2, mobile: 1 }),
    ...cardFields(),
    ...headingStyles({ subtitle: false }),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    item_style: elementStyle('item', 'Item Style', BUTTON_PARTS),
    icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS),
    ...headingStyles({ subtitle: false }),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    primary_btn_style: elementStyle(
      'primaryButton',
      'Primary Button Style',
      BUTTON_PARTS
    ),
    secondary_btn_style: elementStyle(
      'secondaryButton',
      'Secondary Button Style',
      BUTTON_PARTS
    ),
    ...contentSectionControls({ keepDisplay: true }),
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

const columnWidthValueSchema = z
  .string()
  .refine(
    v =>
      v === 'auto' || v === 'fill' || v === 'custom' || SIZE_RE.test(v.trim()),
    {
      message:
        'Width must be auto, fill, or a CSS size (px, %, rem, em, fr, ch, vw)',
    }
  );

const columnAlignValueSchema = z.enum(['start', 'center', 'end']);

export const ColumnBlock = defineBlock({
  type: 'Column',
  label: 'Column',
  icon: 'columns',
  parents: ['Columns', 'HeaderBar', 'HeaderColumns', 'FooterColumns'],
  schema: z
    .object({
      width: responsive(columnWidthValueSchema).optional(),
      align: responsive(columnAlignValueSchema).optional(),
      verticalAlign: responsive(columnAlignValueSchema).optional(),
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
  render: Column,
  fields: {
    width: {
      label: 'Width',
      group: CONTENT,
      tab: 'style',
      type: 'text',
      placeholder: 'fill, auto, 50%, 2fr, 240px…',
      responsive: true,
    },
    align: {
      label: 'Horizontal align',
      group: CONTENT,
      tab: 'style',
      type: 'radio',
      responsive: true,
      options: [
        { label: 'Start', value: 'start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'end' },
      ],
    },
    verticalAlign: {
      label: 'Vertical align',
      group: CONTENT,
      tab: 'style',
      type: 'radio',
      responsive: true,
      options: [
        { label: 'Top', value: 'start' },
        { label: 'Center', value: 'center' },
        { label: 'Bottom', value: 'end' },
      ],
    },
    ...sectionControls(),
  },
  defaults: {
    width: 'fill',
    content: [],
    section: {
      paddingY: 'none',
      background: 'default',
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
      anchor: '',
    },
  },
  slots: {
    content: { disallow: ['Column', 'Columns', 'GlobalRef'] },
  },
});

export const ColumnsBlock = defineBlock({
  type: 'Columns',
  label: 'Columns',
  category: 'layout',
  icon: 'columns',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
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
    columns: [],
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
    columns: { allow: ['Column'] },
  },
});

export const ContainerBlock = defineBlock({
  type: 'Container',
  label: 'Container',
  category: 'layout',
  icon: 'container',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Video,
  fields: {
    url: { label: 'Video URL', group: CONTENT, type: 'text' },
    posterUrl: {
      label: 'Poster image',
      group: CONTENT,
      type: 'custom',
      render: MediaUrlField,
      when: (p: any) => Boolean(p.popupTrigger),
    },
    ...overlayTriggerFields(),
    frame_style: elementStyle('frame', 'Frame Style', MEDIA_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      sources: z.array(z.enum(['youtube', 'vimeo', 'direct'])).optional(),
      source: z
        .union([
          z.enum(['all', 'youtube', 'vimeo', 'direct']),
          z.array(z.enum(['youtube', 'vimeo', 'direct'])),
        ])
        .optional(),
      showSearch: z.boolean().optional(),
      searchPlaceholder: z.string().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        { label: 'Grid', value: 'grid' },
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
      defaultValue: 3,
      when: (p: any) => p.layout === 'grid',
    },
    overlayId: {
      label: 'Popup / Drawer',
      group: CONTENT,
      type: 'custom',
      render: OverlayPickerField,
      when: (p: any) => p.layout === 'grid',
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
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    description_style: elementStyle(
      'description',
      'Description Style',
      TEXT_PARTS
    ),
    player_style: elementStyle('player', 'Player Frame Style', BUTTON_PARTS),
    now_playing_style: elementStyle(
      'nowPlaying',
      'Now Playing Title Style',
      TEXT_PARTS
    ),
    search_style: elementStyle('search', 'Search Input Style', FIELD_PARTS, {
      when: (p: any) => p.showSearch !== false,
    }),
    filter_style: elementStyle('filter', 'Filter Tab Style', BUTTON_PARTS),
    list_item_style: elementStyle('listItem', 'List Item Style', BUTTON_PARTS),
    thumbnail_style: elementStyle('thumbnail', 'Thumbnail Style', MEDIA_PARTS),
    list_title_style: elementStyle('listTitle', 'List Title Style', TEXT_PARTS),
    badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Embed,
  fields: {
    url: { label: 'Embed URL', group: CONTENT, type: 'text' },
    frame_style: elementStyle('frame', 'Frame Style', MEDIA_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: MapBlock,
  fields: {
    address: { label: 'Address', group: CONTENT, type: 'text' },
    frame_style: elementStyle('frame', 'Frame Style', MEDIA_PARTS),
    caption_style: elementStyle('caption', 'Address Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    frame_style: elementStyle('frame', 'Frame Style', BUTTON_PARTS),
    header_style: elementStyle('header', 'Header Style', BUTTON_PARTS),
    code_style: elementStyle('code', 'Code Style', TEXT_PARTS),
    copy_button_style: elementStyle(
      'copyButton',
      'Copy Button Style',
      BUTTON_PARTS
    ),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    buttonPosition: {
      label: 'Button position',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Right', value: 'right' },
        { label: 'Left', value: 'left' },
        { label: 'Top', value: 'top' },
        { label: 'Bottom', value: 'bottom' },
      ],
    },
    buttonWidth: {
      label: 'Button width',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Full width', value: 'full' },
      ],
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    description_style: elementStyle(
      'description',
      'Description Style',
      TEXT_PARTS
    ),
    subtitle_style: elementStyle('subtitle', 'Short Text Style', TEXT_PARTS),
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    success_style: elementStyle(
      'success',
      'Success Message Style (after submit)',
      FIELD_PARTS
    ),
    ...contentSectionControls(),
  },
  defaults: {
    title: 'Newsletter',
    subtitle: '',
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
  render: ImageMorph,
  fields: {
    morph: {
      label: 'Morph',
      group: CONTENT,
      type: 'custom',
      render: ImageMorphField,
    },
    ...overlayTriggerFields(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
      tab: 'style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    content_style: elementStyle('content', 'Content Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
      imageSize: imageSizeSchema.optional(),
    })
    .passthrough(),
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
      tab: 'style',
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
      when: (p: any) => !p.popupTrigger,
    },
    ...overlayTriggerFields(),
    image_style: elementStyle(
      'image',
      'Image Style',
      MEDIA_PARTS.filter(part => part !== 'imageSize')
    ),
    caption_style: elementStyle('caption', 'Caption Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        overlayId: {
          label: 'Popup / Drawer override',
          group: CONTENT,
          type: 'custom',
          render: OverlayPickerField,
          when: (item: any, root?: any) =>
            Boolean(root ? root.popupTrigger : item?.popupTrigger),
        },
      },
      defaultItem: { url: '', alt: '', caption: '' },
    },
    ...overlayTriggerFields(),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    caption_style: elementStyle('caption', 'Caption Style', TEXT_PARTS),
    ...headingStyles(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    label_style: elementStyle('label', 'Field Label Style', TEXT_PARTS),
    required_style: elementStyle(
      'required',
      'Required Indicator Style',
      TEXT_PARTS
    ),
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    choice_style: elementStyle('choice', 'Choice Style', TEXT_PARTS),
    help_style: elementStyle('help', 'Help Text Style', TEXT_PARTS),
    button_style: elementStyle('button', 'Submit Button Style', BUTTON_PARTS),
    success_style: elementStyle(
      'success',
      'Success Message Style (after submit)',
      FIELD_PARTS
    ),
    error_style: elementStyle(
      'error',
      'Error Message Style (after submit)',
      FIELD_PARTS
    ),
    ...headingStyles({ eyebrow: false }),
    ...contentSectionControls(),
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
    linkAction: {
      label: 'Action',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'URL / Page', value: 'url' },
        { label: 'Open popup/drawer', value: 'overlay' },
      ],
    },
    overlayId: {
      label: 'Popup / Drawer',
      group: CONTENT,
      type: 'custom',
      render: OverlayPickerField,
      when: (p: Record<string, unknown>) => p.linkAction === 'overlay',
    },
    link: {
      label: 'Link',
      group: CONTENT,
      type: 'custom',
      render: PlainUrlField,
      when: (p: Record<string, unknown>) => p.linkAction !== 'overlay',
    },
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
    ...contentSectionControls(),
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

export const OverlayCloseBlock = defineBlock({
  type: 'OverlayClose',
  label: 'Close overlay',
  category: 'layout',
  icon: 'button',
  inlineProps: ['label'],
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: OverlayClose,
  fields: {
    label: { label: 'Label', group: CONTENT, type: 'text' },
    variant: {
      label: 'Type',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Link', value: 'link' },
        { label: 'Button', value: 'button' },
        { label: 'Icon (X)', value: 'icon' },
      ],
    },
    buttonStyle: {
      label: 'Button style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Soft', value: 'soft' },
        { label: 'Ghost', value: 'ghost' },
      ],
    },
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
    close_link_style: elementStyle('close', 'Close Style', TEXT_PARTS, {
      when: (p: any) => (p.variant ?? 'link') === 'link',
    }),
    close_btn_style: elementStyle('close', 'Close Style', BUTTON_PARTS, {
      when: (p: any) => p.variant === 'button' || p.variant === 'icon',
    }),
    ...contentSectionControls(),
  },
  defaults: {
    label: 'No thanks',
    variant: 'link',
    buttonStyle: 'outline',
    alignment: 'center',
    size: 'md',
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

export const LightboxImageBlock = defineBlock({
  type: 'LightboxImage',
  label: 'Lightbox',
  category: 'content',
  icon: 'image',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: LightboxImage,
  fields: {
    transition: {
      label: 'Transition',
      group: 'Animation',
      section: 'Animation',
      tab: 'content',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Fade', value: 'fade' },
        { label: 'Slide', value: 'slide' },
        { label: 'Zoom', value: 'zoom' },
      ],
      defaultValue: 'fade',
    },
    transitionSpeed: {
      label: 'Transition speed',
      group: 'Animation',
      section: 'Animation',
      tab: 'content',
      type: 'select',
      options: [
        { label: 'Fast (200ms)', value: 'fast' },
        { label: 'Normal (350ms)', value: 'normal' },
        { label: 'Slow (600ms)', value: 'slow' },
      ],
      defaultValue: 'normal',
      when: (p: any) => p.transition !== 'none',
    },

    autoplayVideo: {
      label: 'Autoplay videos',
      group: 'Video',
      section: 'Video',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    saveProgress: {
      label: 'Save watch progress',
      group: 'Video',
      section: 'Video',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },

    fallbackImage: {
      label: 'Fallback image',
      group: 'Source',
      section: 'Source',
      tab: 'content',
      type: 'image',
    },
    fallbackAlt: {
      label: 'Fallback alt text',
      group: 'Source',
      section: 'Source',
      tab: 'content',
      type: 'text',
    },
    fallbackCaption: {
      label: 'Fallback caption',
      group: 'Source',
      section: 'Source',
      tab: 'content',
      type: 'text',
    },

    showArrows: {
      label: 'Show arrows',
      group: 'Navigation',
      section: 'Navigation',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    loop: {
      label: 'Loop images',
      group: 'Navigation',
      section: 'Navigation',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    keyboard: {
      label: 'Keyboard arrows',
      group: 'Navigation',
      section: 'Navigation',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    swipe: {
      label: 'Touch swipe',
      group: 'Navigation',
      section: 'Navigation',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    showCounter: {
      label: 'Image counter',
      group: 'Navigation',
      section: 'Navigation',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },

    fit: {
      label: 'Image fit',
      group: 'Display',
      section: 'Display',
      tab: 'content',
      type: 'select',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
      ],
      defaultValue: 'contain',
    },
    maxHeight: {
      label: 'Max height',
      group: 'Display',
      section: 'Display',
      tab: 'content',
      type: 'select',
      options: [
        { label: '80vh', value: '80vh' },
        { label: '90vh', value: '90vh' },
        { label: '60vh', value: '60vh' },
        { label: '100%', value: '100%' },
        { label: '600px', value: '600px' },
        { label: '400px', value: '400px' },
      ],
      defaultValue: '80vh',
    },
    showCaption: {
      label: 'Show caption',
      group: 'Display',
      section: 'Display',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    captionPosition: {
      label: 'Caption position',
      group: 'Display',
      section: 'Display',
      tab: 'content',
      type: 'select',
      options: [
        { label: 'Below image', value: 'below' },
        { label: 'Over image', value: 'over' },
      ],
      defaultValue: 'below',
      when: (p: any) => p.showCaption !== false,
    },

    enableZoom: {
      label: 'Enable zoom',
      group: 'Zoom',
      section: 'Zoom',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    maxZoom: {
      label: 'Max zoom',
      group: 'Zoom',
      section: 'Zoom',
      tab: 'content',
      type: 'select',
      options: [
        { label: '2x', value: 2 },
        { label: '3x', value: 3 },
        { label: '4x', value: 4 },
      ],
      defaultValue: 2,
      when: (p: any) => p.enableZoom !== false,
    },

    showThumbnails: {
      label: 'Show thumbnails',
      group: 'Thumbnails',
      section: 'Thumbnails',
      tab: 'content',
      type: 'toggle',
      defaultValue: true,
    },
    thumbnailSize: {
      label: 'Thumbnail size',
      group: 'Thumbnails',
      section: 'Thumbnails',
      tab: 'content',
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
      ],
      defaultValue: 'sm',
      when: (p: any) => p.showThumbnails !== false,
    },

    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    arrow_style: elementStyle('arrow', 'Arrow Style', BUTTON_PARTS, {
      when: (p: any) => p.showArrows !== false,
    }),
    counter_style: elementStyle('counter', 'Counter Style', TEXT_PARTS, {
      when: (p: any) => p.showCounter !== false,
    }),
    caption_style: elementStyle('caption', 'Caption Style', TEXT_PARTS, {
      when: (p: any) => p.showCaption !== false,
    }),
    thumbnail_style: elementStyle('thumbnail', 'Thumbnail Style', MEDIA_PARTS, {
      when: (p: any) => p.showThumbnails !== false,
    }),
    ...contentSectionControls(),
  },
  defaults: {
    transition: 'fade',
    transitionSpeed: 'normal',
    autoplayVideo: true,
    saveProgress: true,
    fallbackImage: '',
    fallbackAlt: '',
    fallbackCaption: '',
    showArrows: true,
    loop: true,
    keyboard: true,
    swipe: true,
    showCounter: true,
    fit: 'contain',
    maxHeight: '80vh',
    showCaption: true,
    captionPosition: 'below',
    enableZoom: true,
    maxZoom: 2,
    showThumbnails: true,
    thumbnailSize: 'sm',
    section: {
      paddingY: 'none',
      background: 'default',
    },
  },
});

export const HeadingBlock = defineBlock({
  type: 'Heading',
  label: 'Heading',
  category: 'content',
  icon: 'type',
  inlineProps: ['text'],
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Heading,
  fields: {
    text: { label: 'Text', group: CONTENT, type: 'text' },
    level: {
      label: 'Tag',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'H1', value: 'h1' },
        { label: 'H2', value: 'h2' },
        { label: 'H3', value: 'h3' },
        { label: 'H4', value: 'h4' },
        { label: 'H5', value: 'h5' },
        { label: 'H6', value: 'h6' },
      ],
    },
    size: {
      label: 'Size',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' },
        { label: '2XL', value: '2xl' },
      ],
    },
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
    heading_style: elementStyle('heading', 'Heading Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    text: 'Heading',
    level: 'h2',
    size: 'lg',
    alignment: 'left',
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

export const DividerBlock = defineBlock({
  type: 'Divider',
  label: 'Divider',
  category: 'layout',
  icon: 'minus',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
  render: Divider,
  fields: {
    style: {
      label: 'Style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' },
      ],
    },
    thickness: { label: 'Thickness (px)', group: CONTENT, type: 'number' },
    spacing: {
      label: 'Spacing',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    ...contentSectionControls(),
  },
  defaults: {
    style: 'solid',
    thickness: 1,
    spacing: 'md',
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
  render: Spacer,
  fields: {
    height: {
      label: 'Height (px)',
      group: CONTENT,
      type: 'number',
      min: 0,
      max: 400,
    },
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
      tab: 'style',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    container_style: elementStyle('container', 'Container Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
    })
    .passthrough(),
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
  schema: z
    .object({
      collectionBlockId: z.string().optional(),
    })
    .passthrough(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    ...sliderFields({ desktop: 5, tablet: 3, mobile: 2 }),
    logo_style: elementStyle('logo', 'Logo Style', MEDIA_PARTS),
    ...headingStyles(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        ...overlayTriggerFields(),
      },
      defaultItem: { photo: '', name: '', role: '' },
    },
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    photo_style: elementStyle('photo', 'Photo Style', MEDIA_PARTS),
    name_style: elementStyle('name', 'Name Style', TEXT_PARTS),
    role_style: elementStyle('role', 'Role Style', TEXT_PARTS),
    columns: {
      ...columnsField('Columns (desktop)', [2, 3, 4]),
      when: (p: any) => !p.slider,
    },
    ...sliderFields({ desktop: 3, tablet: 2, mobile: 1 }),
    ...cardFields(),
    ...headingStyles({ subtitle: false }),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    line_style: elementStyle('line', 'Line Style', BUTTON_PARTS),
    dot_style: elementStyle('dot', 'Dot Style', BUTTON_PARTS),
    date_style: elementStyle('date', 'Date Style', TEXT_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    body_style: elementStyle('body', 'Body Style', TEXT_PARTS),
    ...headingStyles({ subtitle: false }),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    ...cardStyles(),
    filter_input_style: elementStyle(
      'filterInput',
      'Filter Input Style',
      FIELD_PARTS
    ),
    filter_button_style: elementStyle(
      'filterButton',
      'Filter Button Style',
      BUTTON_PARTS
    ),
    empty_style: elementStyle('empty', 'Empty Message Style', FIELD_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    effect: {
      label: 'Effect',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Slide', value: 'slide' },
        { label: 'Fade', value: 'fade' },
        { label: 'Zoom', value: 'zoom' },
      ],
      defaultValue: 'slide',
    },
    speed: {
      label: 'Speed',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Fast', value: 'fast' },
        { label: 'Normal', value: 'normal' },
        { label: 'Slow', value: 'slow' },
      ],
      defaultValue: 'normal',
      when: (p: any) => p.effect === 'fade' || p.effect === 'zoom',
    },
    slide_style: elementStyle('slide', 'Slide Style', BUTTON_PARTS),
    arrow_style: elementStyle('arrow', 'Arrow Style', BUTTON_PARTS),
    dot_style: elementStyle('dot', 'Dot Indicator Style', BUTTON_PARTS),
    ...contentSectionControls({ keepDisplay: true }),
  },
  defaults: {
    items: [{ title: 'Slide 1', content: [] }],
    showArrows: true,
    showDots: true,
    autoplayInterval: 5,
    effect: 'slide',
    speed: 'normal',
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    tab_list_style: elementStyle('tabList', 'Tab List Style', BUTTON_PARTS),
    tab_style: elementStyle('tab', 'Tab Style', BUTTON_PARTS),
    active_tab_style: elementStyle(
      'activeTab',
      'Active Tab Style',
      BUTTON_PARTS
    ),
    panel_style: elementStyle('panel', 'Panel Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    item_style: elementStyle('item', 'Item Style', BUTTON_PARTS),
    trigger_style: elementStyle('trigger', 'Trigger Style', BUTTON_PARTS),
    icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS),
    panel_style: elementStyle('panel', 'Panel Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    back_link_style: elementStyle('backLink', 'Back Link Style', TEXT_PARTS),
    excerpt_style: elementStyle('excerpt', 'Excerpt Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    bar_style: elementStyle('bar', 'Bar Style', BUTTON_PARTS),
    avatar_style: elementStyle('avatar', 'Avatar Style', MEDIA_PARTS),
    author_style: elementStyle('author', 'Author Style', TEXT_PARTS),
    date_style: elementStyle('date', 'Date Style', TEXT_PARTS),
    category_style: elementStyle('category', 'Category Style', TEXT_PARTS),
    tag_style: elementStyle('tag', 'Tag Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: PostContent,
  fields: {
    width: {
      label: 'Width',
      tab: 'style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    content_style: elementStyle('content', 'Content Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    ...cardStyles(),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: BookmarkButton,
  fields: {
    label: {
      label: 'Button text (empty = icon only)',
      group: CONTENT,
      type: 'text',
    },
    align: {
      label: 'Alignment',
      tab: 'style',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    width: {
      label: 'Width',
      tab: 'style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Audio,
  fields: {
    url: {
      label: 'Audio file URL (mp3, m4a, ogg)',
      group: CONTENT,
      type: 'text',
    },
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
      tab: 'style',
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
    caption_style: elementStyle('caption', 'Caption Style', TEXT_PARTS),
    cover_style: elementStyle('cover', 'Cover Style', MEDIA_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      title: z.string().max(60).optional(),
      emptyText: z.string().max(200).optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: BookmarksDrawer,
  fields: {
    title: { label: 'Drawer title', type: 'text' },
    emptyText: { label: 'Empty message', type: 'textarea' },
    trigger_style: elementStyle('trigger', 'Trigger Style', BUTTON_PARTS),
    badge_style: elementStyle('badge', 'Count Badge Style', BUTTON_PARTS),
    panel_style: elementStyle('panel', 'Drawer Panel Style', BUTTON_PARTS),
    title_style: elementStyle('title', 'Drawer Title Style', TEXT_PARTS),
    close_style: elementStyle('close', 'Close Button Style', BUTTON_PARTS),
    item_style: elementStyle('item', 'Item Style', BUTTON_PARTS),
    thumbnail_style: elementStyle('thumbnail', 'Thumbnail Style', MEDIA_PARTS),
    item_title_style: elementStyle('itemTitle', 'Item Title Style', TEXT_PARTS),
    remove_style: elementStyle('remove', 'Remove Button Style', BUTTON_PARTS),
    empty_style: elementStyle('empty', 'Empty Message Style', TEXT_PARTS),
  },
  defaults: {
    title: 'Saved',
    emptyText:
      'Nothing saved yet. Use the bookmark button on a post to keep it here.',
  },
});

export const AuthorBioBlock = defineBlock({
  type: 'AuthorBio',
  label: 'Author bio',
  category: 'post',
  icon: 'authorbio',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
      tab: 'style',
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
    avatar_style: elementStyle('avatar', 'Avatar Style', MEDIA_PARTS),
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  tab: 'style',
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
  schema: z
    .object({
      layout: z.enum(['horizontal', 'stacked']).optional(),
      latestCount: z.number().int().min(1).max(5).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    showSocial: {
      label: 'Show website & social links',
      group: CONTENT,
      type: 'toggle',
    },
    showPostCount: { label: 'Show post count', group: CONTENT, type: 'toggle' },
    showLatestPosts: {
      label: 'Show latest posts',
      group: CONTENT,
      type: 'toggle',
    },
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
    viewAllLabel: {
      label: '“View all posts” label (blank hides it)',
      group: CONTENT,
      type: 'text',
    },
    width: WIDTH_FIELD,
    ...cardFields(),
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    name_style: elementStyle('name', 'Name Style', TEXT_PARTS),
    bio_style: elementStyle('bio', 'Bio Style', TEXT_PARTS),
    avatar_style: elementStyle('avatar', 'Avatar Style', MEDIA_PARTS),
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    meta_style: elementStyle('meta', 'Meta Style', TEXT_PARTS),
    chip_style: elementStyle('chip', 'Website Chip Style', BUTTON_PARTS),
    social_style: elementStyle('social', 'Social Icon Style', BUTTON_PARTS),
    latest_link_style: elementStyle(
      'latestLink',
      'Latest Post Link Style',
      TEXT_PARTS
    ),
    button_style: elementStyle('button', 'View All Button Style', BUTTON_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      sort: z.enum(['oldest', 'newest']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    showReactions: {
      label: 'Show like / dislike buttons',
      group: CONTENT,
      type: 'toggle',
    },
    formTitle: {
      label: 'Form title',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.showForm !== false,
    },
    submitLabel: {
      label: 'Submit button label',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.showForm !== false,
    },
    pendingMessage: {
      label: 'Message after posting',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.showForm !== false,
    },
    emptyText: {
      label: 'Text when there are no comments',
      group: CONTENT,
      type: 'text',
    },
    closedText: {
      label: 'Text when comments are off (blank hides the block)',
      group: CONTENT,
      type: 'text',
    },
    width: WIDTH_FIELD,
    ...cardFields(),
    heading_style: elementStyle('heading', 'Heading Style', TEXT_PARTS),
    name_style: elementStyle('name', 'Commenter Name Style', TEXT_PARTS),
    body_style: elementStyle('body', 'Comment Text Style', TEXT_PARTS),
    list_style: elementStyle('list', 'Comment List Style', BUTTON_PARTS),
    avatar_style: elementStyle('avatar', 'Avatar Style', BUTTON_PARTS),
    badge_style: elementStyle('badge', 'Author Badge Style', BUTTON_PARTS),
    date_style: elementStyle('date', 'Date Style', TEXT_PARTS),
    action_style: elementStyle('action', 'Action Style', TEXT_PARTS),
    form_style: elementStyle('form', 'Form Style', BUTTON_PARTS),
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    heading: 'Comments',
    sort: 'oldest',
    showForm: true,
    showReactions: true,
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
    showImage: {
      label: 'Show image',
      group: CONTENT,
      type: 'toggle',
      when: (p: any) => p.layout !== 'minimal',
    },
    showDate: { label: 'Show date', group: CONTENT, type: 'toggle' },
    width: {
      label: 'Width',
      tab: 'style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    thumb_style: elementStyle('thumb', 'Thumbnail Style', MEDIA_PARTS),
    label_style: elementStyle('label', 'Direction Label Style', TEXT_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    date_style: elementStyle('date', 'Date Style', TEXT_PARTS),
    ...contentSectionControls(),
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
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
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
        { label: 'None (bookmark only)', value: 'none' },
      ],
    },
    showBookmark: {
      label: 'Show bookmark (save) button',
      group: CONTENT,
      type: 'toggle',
    },
    bookmarkLabel: {
      label: 'Bookmark label (blank = icon only)',
      group: CONTENT,
      type: 'text',
      when: (p: any) => Boolean(p.showBookmark),
    },
    align: {
      label: 'Alignment',
      tab: 'style',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    width: {
      label: 'Width',
      tab: 'style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
      ],
    },
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    icon_style: elementStyle('icon', 'Icon Button Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    label: 'Share',
    networks: 'default',
    showBookmark: false,
    bookmarkLabel: 'Save',
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

export const HeaderBarBlock = defineBlock({
  type: 'HeaderBar',
  label: 'Header bar',
  category: 'header',
  icon: 'layout',
  schema: z
    .object({
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
      stackOn: z.enum(['none', 'mobile', 'tablet']).optional(),
      minHeight: z.string().default(''),
      borderBottom: z.boolean().default(false),
      align: z.enum(['center', 'start', 'end']).default('center'),
    })
    .passthrough(),
  slots: {
    columns: { allow: ['Column'] },
  },
  render: HeaderBar,
  fields: contentFields({
    width: {
      label: 'Width',
      tab: 'style',
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
    stackOn: {
      label: 'Stack columns on',
      type: 'radio',
      options: [
        { label: 'Never', value: 'none' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Tablet', value: 'tablet' },
      ],
    },
    background: {
      label: 'Background',
      tab: 'style',
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
      tab: 'style',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Extra small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    minHeight: { label: 'Minimum height (CSS)', tab: 'style', type: 'text' },
    borderBottom: {
      label: 'Bottom border',
      tab: 'style',
      type: 'radio',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    align: {
      label: 'Vertical alignment',
      tab: 'style',
      type: 'radio',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Start', value: 'start' },
        { label: 'End', value: 'end' },
      ],
    },
  }),
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
  schema: z
    .object({
      width: z.enum(['boxed', 'full']).default('boxed'),
      background: z
        .enum(['default', 'muted', 'inverted', 'primary', 'transparent'])
        .default('default'),
      paddingY: z.enum(['none', 'xs', 'sm', 'md', 'lg']).default('none'),
      columns: z.union([z.number().min(1).max(6), z.array(z.any())]).optional(),
      gap: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
      align: z.enum(['center', 'start', 'end']).default('center'),
      stackOn: z.enum(['mobile', 'tablet']).default('mobile'),
    })
    .passthrough(),
  slots: {
    columns: { allow: ['Column'] },
  },
  render: HeaderColumns,
  fields: contentFields(
    {
      width: {
        label: 'Width',
        tab: 'style',
        type: 'radio',
        options: [
          { label: 'Boxed', value: 'boxed' },
          { label: 'Full', value: 'full' },
        ],
      },
      background: {
        label: 'Background',
        tab: 'style',
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
        tab: 'style',
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
        tab: 'style',
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
    },
    { appearance: ['gap'] }
  ),
  defaults: {
    width: 'boxed',
    background: 'default',
    paddingY: 'none',
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
  schema: z
    .object({
      width: z.enum(['boxed', 'full']).default('boxed'),
      background: z
        .enum(['default', 'muted', 'inverted', 'primary'])
        .default('default'),
      paddingY: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('lg'),
      columns: z.union([z.number().min(1).max(6), z.array(z.any())]).optional(),
      gap: z.enum(['sm', 'md', 'lg', 'xl']).default('lg'),
      stackOn: z.enum(['mobile', 'tablet']).default('mobile'),
    })
    .passthrough(),
  slots: {
    columns: { allow: ['Column'] },
  },
  render: FooterColumns,
  fields: contentFields(
    {
      width: {
        label: 'Width',
        tab: 'style',
        type: 'radio',
        options: [
          { label: 'Boxed', value: 'boxed' },
          { label: 'Full', value: 'full' },
        ],
      },
      background: {
        label: 'Background',
        tab: 'style',
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
        tab: 'style',
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
    { appearance: ['gap'] }
  ),
  defaults: {
    width: 'boxed',
    background: 'default',
    paddingY: 'lg',
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: Logo,
  fields: contentFields(
    {
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
      image_style: elementStyle('image', 'Logo Image Style', MEDIA_PARTS),
      site_name_style: elementStyle('siteName', 'Site Name Style', TEXT_PARTS, {
        when: (props: any) => props.showSiteName !== false,
      }),
      tagline_style: elementStyle('tagline', 'Tagline Style', TEXT_PARTS, {
        when: (props: any) => Boolean(props.tagline),
      }),
    },
    { appearance: ['width'] }
  ),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: NavMenu,
  fields: contentFields(
    {
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
      link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
      active_link_style: elementStyle(
        'activeLink',
        'Active Link Style',
        TEXT_PARTS
      ),
      dropdown_style: elementStyle('dropdown', 'Dropdown Style', BUTTON_PARTS),
      dropdown_link_style: elementStyle(
        'dropdownLink',
        'Dropdown Link Style',
        TEXT_PARTS
      ),
      badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    },
    { appearance: ['gap', 'activeStyle'] }
  ),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: Copyright,
  fields: contentFields({
    text: { label: 'Copyright text', type: 'text' },
    align: {
      label: 'Alignment',
      tab: 'style',
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    text_style: elementStyle('text', 'Text Style', TEXT_PARTS),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: FooterLinks,
  fields: contentFields({
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
    heading_style: elementStyle('heading', 'Heading Style', TEXT_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: MobileMenu,
  fields: contentFields({
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
    trigger_style: elementStyle('trigger', 'Trigger Style', BUTTON_PARTS),
    backdrop_style: elementStyle('backdrop', 'Backdrop Style', BUTTON_PARTS),
    panel_style: elementStyle('panel', 'Drawer Panel Style', BUTTON_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    close_style: elementStyle('close', 'Close Style', BUTTON_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    sub_link_style: elementStyle('subLink', 'Submenu Link Style', TEXT_PARTS),
    sub_toggle_style: elementStyle(
      'subToggle',
      'Submenu Toggle Style',
      BUTTON_PARTS
    ),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: SearchBox,
  fields: contentFields({
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
      tab: 'style',
      type: 'radio',
      options: [
        { label: 'Right aligned', value: 'right' },
        { label: 'Left aligned', value: 'left' },
      ],
    },
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    icon_trigger_style: elementStyle(
      'iconTrigger',
      'Icon Trigger Style',
      BUTTON_PARTS,
      {
        when: (props: any) => props.mode === 'icon-modal',
      }
    ),
    modal_panel_style: elementStyle(
      'modalPanel',
      'Modal Panel Style',
      BUTTON_PARTS,
      {
        when: (props: any) => props.mode === 'icon-modal',
      }
    ),
    results_panel_style: elementStyle(
      'resultsPanel',
      'Results Dropdown Style',
      BUTTON_PARTS,
      {
        when: (props: any) => props.liveResults !== false,
      }
    ),
    result_item_style: elementStyle(
      'resultItem',
      'Result Item Style',
      TEXT_PARTS,
      {
        when: (props: any) => props.liveResults !== false,
      }
    ),
    view_all_style: elementStyle('viewAll', 'View All Link Style', TEXT_PARTS, {
      when: (props: any) => props.liveResults !== false,
    }),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: AnnouncementBar,
  fields: contentFields({
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
    bar_style: elementStyle('bar', 'Bar Style', BUTTON_PARTS),
    text_style: elementStyle('text', 'Text Style', TEXT_PARTS),
    cta_style: elementStyle('cta', 'CTA Link Style', TEXT_PARTS, {
      when: (props: any) => Boolean(props.link),
    }),
    dismiss_style: elementStyle(
      'dismiss',
      'Dismiss Button Style',
      BUTTON_PARTS,
      {
        when: (props: any) => props.dismissible !== false,
      }
    ),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: SocialIcons,
  fields: contentFields(
    {
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
        tab: 'style',
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
      icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS),
    },
    { appearance: ['shape', 'size'] }
  ),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: ContactInfo,
  fields: contentFields({
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
      tab: 'style',
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
    item_style: elementStyle('item', 'Item Style', TEXT_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    icon_style: elementStyle('icon', 'Icon Style', ['color'] as const, {
      when: (props: any) => props.showIcons !== false,
    }),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: LegalLinks,
  fields: contentFields({
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
      tab: 'style',
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
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    separator_style: elementStyle('separator', 'Separator Style', TEXT_PARTS, {
      when: (props: any) => props.separator !== 'none',
    }),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: BackToTop,
  fields: contentFields({
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
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    label_style: elementStyle('label', 'Button Label Style', TEXT_PARTS, {
      when: (props: any) => Boolean(props.label),
    }),
  }),
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
    elements: z.record(z.string(), elementStyleSchema).optional(),
  }),
  render: ThemeToggle,
  fields: {
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
  },
  defaults: {},
});

export const LanguageSwitcherNativeBlock = defineBlock({
  type: 'LanguageSwitcher',
  label: 'Language switcher',
  category: 'header',
  icon: 'globe',
  schema: z
    .object({
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: LanguageSwitcherBlock,
  fields: {
    current_style: elementStyle(
      'current',
      'Current Language Style',
      TEXT_PARTS
    ),
    link_style: elementStyle('link', 'Language Link Style', TEXT_PARTS),
  },
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
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS, {
      when: (props: any) =>
        (props.display ?? 'cards') === 'cards' ||
        (props.display ?? 'cards') === 'team' ||
        (props.display ?? 'cards') === 'testimonials' ||
        (props.display ?? 'cards') === 'testimonial-slider',
    }),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'cards',
    }),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'cards',
    }),
    excerpt_style: elementStyle('excerpt', 'Excerpt Style', TEXT_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'cards',
    }),
    photo_style: elementStyle('photo', 'Photo Style', MEDIA_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'team',
    }),
    name_style: elementStyle('name', 'Name Style', TEXT_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'team',
    }),
    quote_icon_style: elementStyle(
      'quoteIcon',
      'Quote Icon Style',
      ['color'] as const,
      {
        when: (props: any) =>
          (props.display ?? 'cards') === 'testimonials' ||
          (props.display ?? 'cards') === 'testimonial-slider',
      }
    ),
    stars_style: elementStyle(
      'stars',
      'Rating Stars Style',
      ['color'] as const,
      {
        when: (props: any) =>
          (props.display ?? 'cards') === 'testimonial-slider',
      }
    ),
    quote_style: elementStyle('quote', 'Quote Style', TEXT_PARTS, {
      when: (props: any) =>
        (props.display ?? 'cards') === 'testimonials' ||
        (props.display ?? 'cards') === 'testimonial-slider',
    }),
    avatar_style: elementStyle('avatar', 'Avatar Style', MEDIA_PARTS, {
      when: (props: any) =>
        (props.display ?? 'cards') === 'testimonials' ||
        (props.display ?? 'cards') === 'testimonial-slider',
    }),
    author_style: elementStyle('author', 'Author Style', TEXT_PARTS, {
      when: (props: any) =>
        (props.display ?? 'cards') === 'testimonials' ||
        (props.display ?? 'cards') === 'testimonial-slider',
    }),
    role_style: elementStyle('role', 'Role Style', TEXT_PARTS, {
      when: (props: any) =>
        (props.display ?? 'cards') === 'team' ||
        (props.display ?? 'cards') === 'testimonials' ||
        (props.display ?? 'cards') === 'testimonial-slider',
    }),
    arrow_style: elementStyle('arrow', 'Carousel Arrow Style', BUTTON_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'testimonial-slider',
    }),
    item_style: elementStyle('item', 'Item Style', BUTTON_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'faq',
    }),
    question_style: elementStyle('question', 'Question Style', TEXT_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'faq',
    }),
    answer_style: elementStyle('answer', 'Answer Style', TEXT_PARTS, {
      when: (props: any) => (props.display ?? 'cards') === 'faq',
    }),
    icon_style: elementStyle('icon', 'Icon Style', ['color'] as const, {
      when: (props: any) => (props.display ?? 'cards') === 'faq',
    }),
    ...contentSectionControls(),
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

/** Styles for QueryLoop's built-in filter panel, shown only while the panel is on. */
function queryLoopFilterStyles() {
  const on = (props: any) =>
    Boolean(props.filterPosition) && props.filterPosition !== 'none';
  const style = (
    key: string,
    label: string,
    parts: readonly ElementPart[],
    when: (props: any) => boolean = on
  ) => elementStyle(key, label, parts, { when });
  return {
    filter_panel_style: style('panel', 'Filter Panel Style', BUTTON_PARTS),
    filter_label_style: style('label', 'Filter Label Style', TEXT_PARTS),
    filter_input_style: style('input', 'Filter Input Style', FIELD_PARTS),
    filter_chip_style: style('chip', 'Filter Chip Style', BUTTON_PARTS),
    filter_active_chip_style: style(
      'activeChip',
      'Filter Active Chip Style',
      BUTTON_PARTS,
      props =>
        on(props) &&
        (props.filterCategoryStyle === 'chips' ||
          (props.filterTagStyle ?? 'chips') === 'chips')
    ),
    filter_button_style: style('button', 'Filter Button Style', BUTTON_PARTS),
    filter_drawer_toggle_style: style(
      'drawerToggle',
      'Filter Mobile Toggle Style',
      BUTTON_PARTS,
      props => on(props) && props.filterMobileDrawer !== false
    ),
    filter_count_style: style(
      'count',
      'Filter Result Count Style',
      TEXT_PARTS,
      props => on(props) && props.filterShowResultCount !== false
    ),
  };
}

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
    showTerms: {
      label: 'Show categories/tags',
      group: CONTENT,
      type: 'toggle',
    },
    emptyText: { label: 'Empty state text', group: CONTENT, type: 'text' },
    filterPosition: {
      tab: 'content',
      section: 'Filters',
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
      tab: 'content',
      section: 'Filters',
      label: 'Keep sidebar in view while scrolling',
      group: 'Filters',
      type: 'toggle',
      when: (props: any) =>
        props.filterPosition === 'left' || props.filterPosition === 'right',
    },
    ...prefixedFilterFields(
      (props: any) =>
        Boolean(props.filterPosition) && props.filterPosition !== 'none'
    ),
    ...cardFields(),
    ...headingStyles(),
    ...cardStyles({ when: (props: any) => props.layout !== 'table' }),
    arrow_style: elementStyle('arrow', 'Carousel Arrow Style', BUTTON_PARTS, {
      when: (props: any) => props.layout === 'carousel',
    }),
    load_more_style: elementStyle('loadMore', 'Load More Style', BUTTON_PARTS, {
      when: (props: any) =>
        props.pagination === 'load-more' ||
        props.pagination === 'infinite-scroll',
    }),
    empty_style: elementStyle('empty', 'Empty State Style', FIELD_PARTS),
    table_row_style: elementStyle('tableRow', 'Table Row Style', BUTTON_PARTS, {
      when: (props: any) => props.layout === 'table',
    }),
    ...queryLoopFilterStyles(),
    ...contentSectionControls(),
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
      layout: z
        .enum(['grid', 'list', 'masonry', 'carousel', 'featured'])
        .default('grid'),
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
    equalHeight: {
      label: 'Equal height items',
      group: CONTENT,
      type: 'toggle',
    },
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
    ...cardStyles({ when: (props: any) => !props.templateId }),
    arrow_style: elementStyle('arrow', 'Carousel Arrow Style', BUTTON_PARTS, {
      when: (props: any) => props.layout === 'carousel',
    }),
    load_more_style: elementStyle('loadMore', 'Load More Style', BUTTON_PARTS, {
      when: (props: any) =>
        props.pagination === 'load-more' ||
        props.pagination === 'infinite-scroll',
    }),
    empty_style: elementStyle('empty', 'Empty State Style', FIELD_PARTS),
    ...contentSectionControls(),
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
      elements: z.record(z.string(), elementStyleSchema).optional(),
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
    value_style: elementStyle('value', 'Text Style', TEXT_PARTS, {
      when: (props: any) =>
        !['image', 'readMore', 'bookmark'].includes(props.field ?? 'title'),
    }),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS, {
      when: (props: any) => props.field === 'image',
    }),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS, {
      when: (props: any) => props.field === 'readMore',
    }),
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
    panel_style: elementStyle('panel', 'Panel Style', BUTTON_PARTS),
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    chip_style: elementStyle('chip', 'Chip Style', BUTTON_PARTS),
    active_chip_style: elementStyle(
      'activeChip',
      'Active Chip Style',
      BUTTON_PARTS
    ),
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    drawer_toggle_style: elementStyle(
      'drawerToggle',
      'Mobile Drawer Toggle Style',
      BUTTON_PARTS
    ),
    count_style: elementStyle('count', 'Result Count Style', TEXT_PARTS),
    ...contentSectionControls(),
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
    placeholder: {
      label: 'Search input placeholder',
      group: CONTENT,
      type: 'text',
    },
    showTabs: {
      label: 'Show content type tabs',
      group: CONTENT,
      type: 'toggle',
    },
    showThumbnails: {
      label: 'Show thumbnails',
      group: CONTENT,
      type: 'toggle',
    },
    showTypeBadges: {
      label: 'Show type badges',
      group: CONTENT,
      type: 'toggle',
    },
    showSnippets: {
      label: 'Show highlighted snippets',
      group: CONTENT,
      type: 'toggle',
    },
    pageSize: {
      label: 'Results per page',
      group: CONTENT,
      type: 'number',
      min: 1,
      max: 100,
    },
    emptyText: { label: 'Empty state text', group: CONTENT, type: 'text' },
    ...headingStyles(),
    input_style: elementStyle('input', 'Input Style', FIELD_PARTS),
    button_style: elementStyle('button', 'Button Style', BUTTON_PARTS),
    tab_style: elementStyle('tab', 'Tab Style', BUTTON_PARTS),
    count_style: elementStyle('count', 'Result Count Style', TEXT_PARTS),
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    thumbnail_style: elementStyle('thumbnail', 'Thumbnail Style', MEDIA_PARTS),
    badge_style: elementStyle('badge', 'Badge Style', BUTTON_PARTS),
    path_style: elementStyle('path', 'Path Style', TEXT_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    snippet_style: elementStyle('snippet', 'Snippet Style', TEXT_PARTS),
    pagination_style: elementStyle(
      'pagination',
      'Pagination Style',
      BUTTON_PARTS
    ),
    ...contentSectionControls(),
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
      elements: z.record(z.string(), elementStyleSchema).optional(),
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
    card_style: elementStyle('card', 'Card Style', BUTTON_PARTS),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    eyebrow_style: elementStyle('eyebrow', 'Eyebrow Style', TEXT_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    text_style: elementStyle('text', 'Text Style', TEXT_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    ...contentSectionControls(),
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

export const IconBlock = defineBlock({
  type: 'Icon',
  label: 'Icon',
  category: 'basic',
  icon: 'sparkles',
  schema: z
    .object({
      icon: z.string().optional(),
      size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      view: z.enum(['default', 'stacked', 'framed']).optional(),
      shape: z.enum(['circle', 'square']).optional(),
      link: safeUrlSchema.optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Icon,
  fields: {
    icon: iconField('Icon'),
    view: {
      label: 'View',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Stacked', value: 'stacked' },
        { label: 'Framed', value: 'framed' },
      ],
    },
    shape: {
      label: 'Shape',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Circle', value: 'circle' },
        { label: 'Square', value: 'square' },
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
        { label: 'XL', value: 'xl' },
      ],
    },
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
    linkAction: {
      label: 'Action',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'URL / Page', value: 'url' },
        { label: 'Open popup/drawer', value: 'overlay' },
      ],
    },
    overlayId: {
      label: 'Popup / Drawer',
      group: CONTENT,
      type: 'custom',
      render: OverlayPickerField,
      when: (p: Record<string, unknown>) => p.linkAction === 'overlay',
    },
    link: {
      label: 'Link',
      group: CONTENT,
      type: 'custom',
      render: PlainUrlField,
      when: (p: Record<string, unknown>) => p.linkAction !== 'overlay',
    },
    icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    icon: 'Sparkles',
    view: 'default',
    shape: 'circle',
    size: 'md',
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'none' },
  },
});

export const IconBoxBlock = defineBlock({
  type: 'IconBox',
  label: 'Icon Box',
  category: 'basic',
  icon: 'box',
  schema: z
    .object({
      icon: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      position: z.enum(['top', 'left', 'right']).optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
      view: z.enum(['default', 'stacked', 'framed']).optional(),
      shape: z.enum(['circle', 'square']).optional(),
      link: safeUrlSchema.optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: IconBox,
  fields: {
    icon: iconField('Icon'),
    title: { label: 'Title', group: CONTENT, type: 'text' },
    description: { label: 'Description', group: CONTENT, type: 'textarea' },
    position: {
      label: 'Icon Position',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
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
    size: {
      label: 'Icon Size',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'S', value: 'sm' },
        { label: 'M', value: 'md' },
        { label: 'L', value: 'lg' },
        { label: 'XL', value: 'xl' },
      ],
    },
    view: {
      label: 'View',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Stacked', value: 'stacked' },
        { label: 'Framed', value: 'framed' },
      ],
    },
    shape: {
      label: 'Shape',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Circle', value: 'circle' },
        { label: 'Square', value: 'square' },
      ],
    },
    linkAction: {
      label: 'Action',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'URL / Page', value: 'url' },
        { label: 'Open popup/drawer', value: 'overlay' },
      ],
    },
    overlayId: {
      label: 'Popup / Drawer',
      group: CONTENT,
      type: 'custom',
      render: OverlayPickerField,
      when: (p: Record<string, unknown>) => p.linkAction === 'overlay',
    },
    link: {
      label: 'Link',
      group: CONTENT,
      type: 'custom',
      render: PlainUrlField,
      when: (p: Record<string, unknown>) => p.linkAction !== 'overlay',
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    description_style: elementStyle('description', 'Description Style', TEXT_PARTS),
    icon_style: elementStyle('icon', 'Icon Style', BUTTON_PARTS),
    box_style: elementStyle('box', 'Box Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    icon: 'Sparkles',
    title: 'This is the heading',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis.',
    position: 'top',
    alignment: 'center',
    size: 'md',
    view: 'default',
    shape: 'circle',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const ImageBoxBlock = defineBlock({
  type: 'ImageBox',
  label: 'Image Box',
  category: 'basic',
  icon: 'image',
  schema: z
    .object({
      image: z.string().optional(),
      imageAlt: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      position: z.enum(['top', 'left', 'right']).optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      imageSize: z.enum(['sm', 'md', 'lg', 'full']).optional(),
      link: safeUrlSchema.optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: ImageBox,
  fields: {
    image: mediaField('Image'),
    imageAlt: { label: 'Image alt text', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    description: { label: 'Description', group: CONTENT, type: 'textarea' },
    position: {
      label: 'Image Position',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
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
    imageSize: {
      label: 'Image Size',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Full', value: 'full' },
      ],
    },
    linkAction: {
      label: 'Action',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'URL / Page', value: 'url' },
        { label: 'Open popup/drawer', value: 'overlay' },
      ],
    },
    overlayId: {
      label: 'Popup / Drawer',
      group: CONTENT,
      type: 'custom',
      render: OverlayPickerField,
      when: (p: Record<string, unknown>) => p.linkAction === 'overlay',
    },
    link: {
      label: 'Link',
      group: CONTENT,
      type: 'custom',
      render: PlainUrlField,
      when: (p: Record<string, unknown>) => p.linkAction !== 'overlay',
    },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    description_style: elementStyle('description', 'Description Style', TEXT_PARTS),
    image_style: elementStyle('image', 'Image Style', MEDIA_PARTS),
    box_style: elementStyle('box', 'Box Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    image: '',
    imageAlt: '',
    title: 'This is the heading',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    position: 'top',
    alignment: 'center',
    imageSize: 'md',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const CounterBlock = defineBlock({
  type: 'Counter',
  label: 'Counter',
  category: 'basic',
  icon: 'hash',
  schema: z
    .object({
      start: z.number().optional(),
      end: z.number().optional(),
      duration: z.number().optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      separator: z.enum(['', ',', '.', ' ']).optional(),
      title: z.string().optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Counter,
  fields: {
    start: { label: 'Starting Number', group: CONTENT, type: 'number' },
    end: { label: 'Ending Number', group: CONTENT, type: 'number' },
    duration: { label: 'Animation Duration (ms)', group: CONTENT, type: 'number' },
    prefix: { label: 'Prefix', group: CONTENT, type: 'text' },
    suffix: { label: 'Suffix', group: CONTENT, type: 'text' },
    separator: {
      label: 'Thousand Separator',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'None', value: '' },
        { label: 'Comma (,)', value: ',' },
        { label: 'Dot (.)', value: '.' },
        { label: 'Space ( )', value: ' ' },
      ],
    },
    title: { label: 'Title', group: CONTENT, type: 'text' },
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
    number_style: elementStyle('number', 'Number Style', TEXT_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    start: 0,
    end: 100,
    duration: 2000,
    prefix: '',
    suffix: '+',
    separator: ',',
    title: 'Cool Number',
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const ProgressBarBlock = defineBlock({
  type: 'ProgressBar',
  label: 'Progress Bar',
  category: 'basic',
  icon: 'bar-chart',
  schema: z
    .object({
      title: z.string().optional(),
      percent: z.number().optional(),
      innerText: z.string().optional(),
      showPercent: z.boolean().optional(),
      height: z.number().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: ProgressBar,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    percent: { label: 'Percentage', group: CONTENT, type: 'number' },
    innerText: { label: 'Inner Text', group: CONTENT, type: 'text' },
    showPercent: { label: 'Show Percentage', group: CONTENT, type: 'toggle' },
    height: { label: 'Height (px)', group: CONTENT, type: 'number' },
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    bar_style: elementStyle('bar', 'Bar Style', BUTTON_PARTS),
    track_style: elementStyle('track', 'Track Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    title: 'My Skill',
    percent: 75,
    innerText: 'Web Development',
    showPercent: true,
    height: 16,
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const StarRatingBlock = defineBlock({
  type: 'StarRating',
  label: 'Star Rating',
  category: 'basic',
  icon: 'star',
  schema: z
    .object({
      rating: z.number().optional(),
      scale: z.union([z.literal(5), z.literal(10)]).optional(),
      title: z.string().optional(),
      showScore: z.boolean().optional(),
      size: z.enum(['sm', 'md', 'lg']).optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: StarRating,
  fields: {
    rating: { label: 'Rating', group: CONTENT, type: 'number' },
    scale: {
      label: 'Scale',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: '0–5', value: 5 },
        { label: '0–10', value: 10 },
      ],
    },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    showScore: { label: 'Show Score', group: CONTENT, type: 'toggle' },
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
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    score_style: elementStyle('score', 'Score Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    rating: 4.5,
    scale: 5,
    title: 'Rating',
    showScore: true,
    size: 'md',
    alignment: 'left',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const CountdownBlock = defineBlock({
  type: 'Countdown',
  label: 'Countdown',
  category: 'basic',
  icon: 'clock',
  schema: z
    .object({
      type: z.enum(['due_date', 'evergreen']).optional(),
      dueDate: z.string().optional(),
      evergreenHours: z.number().optional(),
      evergreenMinutes: z.number().optional(),
      evergreenKey: z.string().optional(),
      showDays: z.boolean().optional(),
      showHours: z.boolean().optional(),
      showMinutes: z.boolean().optional(),
      showSeconds: z.boolean().optional(),
      expireAction: z.enum(['hide', 'message', 'redirect']).optional(),
      expireMessage: z.string().optional(),
      redirectUrl: z.string().optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Countdown,
  fields: {
    type: {
      label: 'Countdown Type',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Due Date', value: 'due_date' },
        { label: 'Evergreen (Per Visitor)', value: 'evergreen' },
      ],
    },
    dueDate: {
      label: 'Due Date (ISO string)',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.type !== 'evergreen',
    },
    evergreenHours: {
      label: 'Evergreen Hours',
      group: CONTENT,
      type: 'number',
      when: (p: any) => p.type === 'evergreen',
    },
    evergreenMinutes: {
      label: 'Evergreen Minutes',
      group: CONTENT,
      type: 'number',
      when: (p: any) => p.type === 'evergreen',
    },
    showDays: { label: 'Show Days', group: CONTENT, type: 'toggle' },
    showHours: { label: 'Show Hours', group: CONTENT, type: 'toggle' },
    showMinutes: { label: 'Show Minutes', group: CONTENT, type: 'toggle' },
    showSeconds: { label: 'Show Seconds', group: CONTENT, type: 'toggle' },
    expireAction: {
      label: 'Action After Expire',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Show Message', value: 'message' },
        { label: 'Hide Countdown', value: 'hide' },
        { label: 'Redirect', value: 'redirect' },
      ],
    },
    expireMessage: {
      label: 'Expire Message',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.expireAction === 'message',
    },
    redirectUrl: {
      label: 'Redirect URL',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.expireAction === 'redirect',
    },
    box_style: elementStyle('box', 'Box Style', BUTTON_PARTS),
    number_style: elementStyle('number', 'Number Style', TEXT_PARTS),
    label_style: elementStyle('label', 'Label Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    type: 'due_date',
    dueDate: '2026-12-31T23:59:59',
    evergreenHours: 24,
    evergreenMinutes: 0,
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    expireAction: 'message',
    expireMessage: 'This offer has expired.',
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const FlipBoxBlock = defineBlock({
  type: 'FlipBox',
  label: 'Flip Box',
  category: 'basic',
  icon: 'layers',
  schema: z
    .object({
      direction: z.enum(['flip-left', 'flip-right', 'flip-up', 'flip-down']).optional(),
      height: z.number().optional(),
      frontIcon: z.string().optional(),
      frontImage: z.string().optional(),
      frontTitle: z.string().optional(),
      frontDescription: z.string().optional(),
      frontBgColor: z.string().optional(),
      backTitle: z.string().optional(),
      backDescription: z.string().optional(),
      backButtonText: z.string().optional(),
      backButtonLink: safeUrlSchema.optional(),
      backButtonVariant: z.enum(['primary', 'secondary', 'outline', 'soft']).optional(),
      backBgColor: z.string().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: FlipBox,
  fields: {
    direction: {
      label: 'Flip Effect',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Flip Left', value: 'flip-left' },
        { label: 'Flip Right', value: 'flip-right' },
        { label: 'Flip Up', value: 'flip-up' },
        { label: 'Flip Down', value: 'flip-down' },
      ],
    },
    height: { label: 'Height (px)', group: CONTENT, type: 'number' },
    frontIcon: iconField('Front Icon'),
    frontImage: mediaField('Front Image'),
    frontTitle: { label: 'Front Title', group: CONTENT, type: 'text' },
    frontDescription: { label: 'Front Description', group: CONTENT, type: 'textarea' },
    frontBgColor: { label: 'Front Background Color', group: CONTENT, type: 'text' },
    backTitle: { label: 'Back Title', group: CONTENT, type: 'text' },
    backDescription: { label: 'Back Description', group: CONTENT, type: 'textarea' },
    backButtonText: { label: 'Back Button Text', group: CONTENT, type: 'text' },
    backButtonLink: { label: 'Back Button Link', group: CONTENT, type: 'custom', render: PlainUrlField },
    backBgColor: { label: 'Back Background Color', group: CONTENT, type: 'text' },
    front_style: elementStyle('front', 'Front Face Style', BUTTON_PARTS),
    back_style: elementStyle('back', 'Back Face Style', BUTTON_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    direction: 'flip-left',
    height: 320,
    frontIcon: 'Sparkles',
    frontTitle: 'Front Title',
    frontDescription: 'Hover or tap to reveal back side details.',
    backTitle: 'Back Title',
    backDescription: 'Additional information and call to action.',
    backButtonText: 'Read More',
    backButtonLink: '/',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const AnimatedHeadlineBlock = defineBlock({
  type: 'AnimatedHeadline',
  label: 'Animated Headline',
  category: 'basic',
  icon: 'type',
  schema: z
    .object({
      styleType: z.enum(['highlight', 'rotating']).optional(),
      highlightShape: z.enum(['circle', 'underline', 'curly', 'strikethrough']).optional(),
      rotatingEffect: z.enum(['typing', 'fade', 'slide']).optional(),
      beforeText: z.string().optional(),
      highlightedText: z.string().optional(),
      rotatingWords: z.array(z.string()).optional(),
      afterText: z.string().optional(),
      tag: z.enum(['h1', 'h2', 'h3', 'h4', 'p']).optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      strokeColor: z.string().optional(),
      duration: z.number().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: AnimatedHeadline,
  fields: {
    styleType: {
      label: 'Style',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Highlighted', value: 'highlight' },
        { label: 'Rotating', value: 'rotating' },
      ],
    },
    highlightShape: {
      label: 'Highlight Shape',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Circle', value: 'circle' },
        { label: 'Underline', value: 'underline' },
        { label: 'Curly', value: 'curly' },
        { label: 'Strikethrough', value: 'strikethrough' },
      ],
      when: (p: any) => p.styleType !== 'rotating',
    },
    rotatingEffect: {
      label: 'Rotating Effect',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Typing', value: 'typing' },
        { label: 'Fade', value: 'fade' },
        { label: 'Slide', value: 'slide' },
      ],
      when: (p: any) => p.styleType === 'rotating',
    },
    beforeText: { label: 'Before Text', group: CONTENT, type: 'text' },
    highlightedText: {
      label: 'Highlighted Text',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.styleType !== 'rotating',
    },
    afterText: { label: 'After Text', group: CONTENT, type: 'text' },
    tag: {
      label: 'HTML Tag',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'H1', value: 'h1' },
        { label: 'H2', value: 'h2' },
        { label: 'H3', value: 'h3' },
        { label: 'H4', value: 'h4' },
        { label: 'P', value: 'p' },
      ],
    },
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
    heading_style: elementStyle('heading', 'Headline Style', TEXT_PARTS),
    animated_style: elementStyle('animated', 'Animated Word Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    styleType: 'highlight',
    highlightShape: 'circle',
    rotatingEffect: 'typing',
    beforeText: 'This page is',
    highlightedText: 'amazing',
    rotatingWords: ['amazing', 'fast', 'modern'],
    afterText: 'to read',
    tag: 'h2',
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const PriceListBlock = defineBlock({
  type: 'PriceList',
  label: 'Price List',
  category: 'basic',
  icon: 'dollar-sign',
  schema: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      leaderStyle: z.enum(['dotted', 'dashed', 'solid', 'none']).optional(),
      columns: z.union([z.literal(1), z.literal(2)]).optional(),
      imagePosition: z.enum(['left', 'right']).optional(),
      items: z
        .array(
          z.object({
            title: z.string(),
            price: z.string(),
            description: z.string().optional(),
            image: z.string().optional(),
            link: safeUrlSchema.optional(),
          })
        )
        .optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: PriceList,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    subtitle: { label: 'Subtitle', group: CONTENT, type: 'textarea' },
    leaderStyle: {
      label: 'Leader Line Style',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Dotted', value: 'dotted' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Solid', value: 'solid' },
        { label: 'None', value: 'none' },
      ],
    },
    columns: {
      label: 'Columns',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
      ],
    },
    imagePosition: {
      label: 'Image Position',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
    title_style: elementStyle('itemTitle', 'Item Title Style', TEXT_PARTS),
    price_style: elementStyle('itemPrice', 'Price Style', TEXT_PARTS),
    description_style: elementStyle('itemDescription', 'Description Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    title: 'Menu & Pricing',
    leaderStyle: 'dotted',
    columns: 1,
    imagePosition: 'left',
    items: [
      {
        title: 'First Item',
        price: '$20',
        description: 'Description of the item with ingredients or features.',
      },
      {
        title: 'Second Item',
        price: '$35',
        description: 'Premium selection made with care.',
      },
      {
        title: 'Third Item',
        price: '$49',
        description: 'Comprehensive package with all options included.',
      },
    ],
    section: { ...DEFAULT_SECTION, paddingY: 'md' },
  },
});

export const TableOfContentsBlock = defineBlock({
  type: 'TableOfContents',
  label: 'Table of Contents',
  category: 'basic',
  icon: 'list',
  schema: z
    .object({
      title: z.string().optional(),
      levels: z.array(z.enum(['h2', 'h3', 'h4'])).optional(),
      collapsible: z.boolean().optional(),
      defaultCollapsed: z.boolean().optional(),
      marker: z.enum(['numbers', 'bullets', 'none']).optional(),
      hierarchical: z.boolean().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: TableOfContents,
  fields: {
    title: { label: 'Title', group: CONTENT, type: 'text' },
    collapsible: { label: 'Collapsible', group: CONTENT, type: 'toggle' },
    defaultCollapsed: { label: 'Default Collapsed', group: CONTENT, type: 'toggle' },
    marker: {
      label: 'Marker',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'Numbers', value: 'numbers' },
        { label: 'Bullets', value: 'bullets' },
        { label: 'None', value: 'none' },
      ],
    },
    hierarchical: { label: 'Hierarchical Indent', group: CONTENT, type: 'toggle' },
    box_style: elementStyle('box', 'Box Style', BUTTON_PARTS),
    title_style: elementStyle('title', 'Title Style', TEXT_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    title: 'Table of Contents',
    collapsible: true,
    defaultCollapsed: false,
    marker: 'numbers',
    hierarchical: true,
    levels: ['h2', 'h3'],
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
  },
});

export const BreadcrumbsBlock = defineBlock({
  type: 'Breadcrumbs',
  label: 'Breadcrumbs',
  category: 'basic',
  icon: 'navigation',
  schema: z
    .object({
      homeLabel: z.string().optional(),
      separator: z.string().optional(),
      showCurrent: z.boolean().optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Breadcrumbs,
  fields: {
    homeLabel: { label: 'Home Label', group: CONTENT, type: 'text' },
    separator: { label: 'Separator', group: CONTENT, type: 'text' },
    showCurrent: { label: 'Show Current Page', group: CONTENT, type: 'toggle' },
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
    nav_style: elementStyle('nav', 'Nav Style', BUTTON_PARTS),
    link_style: elementStyle('link', 'Link Style', TEXT_PARTS),
    current_style: elementStyle('current', 'Current Page Style', TEXT_PARTS),
    ...contentSectionControls(),
  },
  defaults: {
    homeLabel: 'Home',
    separator: '/',
    showCurrent: true,
    alignment: 'left',
    section: { ...DEFAULT_SECTION, paddingY: 'none' },
  },
});

export const TestimonialCarouselBlock = defineBlock({
  type: 'TestimonialCarousel',
  label: 'Testimonial Carousel',
  category: 'basic',
  icon: 'message-square',
  schema: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      sliderPerView: z.number().optional(),
      sliderAutoplay: z.boolean().optional(),
      sliderLoop: z.boolean().optional(),
      items: z
        .array(
          z.object({
            quote: z.string(),
            author: z.string(),
            role: z.string().optional(),
            company: z.string().optional(),
            avatar: z.string().optional(),
          })
        )
        .optional(),
      cardVariant: z
        .enum(['default', 'flat', 'outline', 'elevated', 'glass', 'none'])
        .optional(),
      cardHover: z.boolean().optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: TestimonialCarousel,
  fields: {
    eyebrow: { label: 'Eyebrow', group: CONTENT, type: 'text' },
    title: { label: 'Title', group: CONTENT, type: 'text' },
    sliderPerView: {
      label: 'Slides Per View',
      group: CONTENT,
      type: 'select',
      options: [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
      ],
    },
    sliderAutoplay: { label: 'Autoplay', group: CONTENT, type: 'toggle' },
    sliderLoop: { label: 'Infinite Loop', group: CONTENT, type: 'toggle' },
    ...cardFields(),
    ...contentSectionControls(),
  },
  defaults: {
    title: 'What Our Clients Say',
    eyebrow: 'Testimonials',
    sliderPerView: 2,
    sliderAutoplay: false,
    sliderLoop: true,
    items: [
      {
        quote: 'This builder is lightning fast and intuitive.',
        author: 'Alex Morgan',
        role: 'CTO',
        company: 'TechCorp',
      },
      {
        quote: 'We cut our design and publishing time by 75%.',
        author: 'Sarah Lin',
        role: 'Head of Growth',
        company: 'Studio Design',
      },
      {
        quote: 'Elementor users will feel right at home here.',
        author: 'Dave Wilson',
        role: 'Agency Founder',
        company: 'WP Studio',
      },
    ],
    section: { ...DEFAULT_SECTION, paddingY: 'md' },
  },
});

export const HotspotBlock = defineBlock({
  type: 'Hotspot',
  label: 'Hotspot',
  category: 'basic',
  icon: 'target',
  schema: z
    .object({
      image: z.string().optional(),
      imageAlt: z.string().optional(),
      pulse: z.boolean().optional(),
      trigger: z.enum(['hover', 'click']).optional(),
      spotColor: z.string().optional(),
      spots: z
        .array(
          z.object({
            id: z.string(),
            x: z.number(),
            y: z.number(),
            title: z.string(),
            content: z.string().optional(),
            icon: z.string().optional(),
            link: safeUrlSchema.optional(),
          })
        )
        .optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Hotspot,
  fields: {
    image: mediaField('Image'),
    imageAlt: { label: 'Alt text', group: CONTENT, type: 'text' },
    trigger: {
      label: 'Trigger',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'Hover', value: 'hover' },
        { label: 'Click', value: 'click' },
      ],
    },
    pulse: { label: 'Pulse Animation', group: CONTENT, type: 'toggle' },
    spotColor: { label: 'Spot Color', group: CONTENT, type: 'text' },
    ...contentSectionControls(),
  },
  defaults: {
    image: '',
    trigger: 'hover',
    pulse: true,
    spotColor: '#4f46e5',
    spots: [
      {
        id: 'spot-1',
        x: 30,
        y: 40,
        title: 'Key Feature',
        content: 'Contextual info about this part of the image.',
      },
    ],
    section: { ...DEFAULT_SECTION, paddingY: 'md' },
  },
});

export const LottieBlock = defineBlock({
  type: 'Lottie',
  label: 'Lottie',
  category: 'basic',
  icon: 'play-circle',
  schema: z
    .object({
      source: z.enum(['url', 'json']).optional(),
      url: z.string().optional(),
      jsonData: z.string().optional(),
      trigger: z.enum(['load', 'view', 'hover', 'scroll']).optional(),
      loop: z.boolean().optional(),
      speed: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alignment: z.enum(['left', 'center', 'right']).optional(),
      section: sectionSettingsSchema.optional(),
      elements: z.record(z.string(), elementStyleSchema).optional(),
    })
    .passthrough(),
  render: Lottie,
  fields: {
    source: {
      label: 'Source',
      group: CONTENT,
      type: 'radio',
      options: [
        { label: 'URL', value: 'url' },
        { label: 'Raw JSON', value: 'json' },
      ],
    },
    url: {
      label: 'Lottie JSON URL',
      group: CONTENT,
      type: 'text',
      when: (p: any) => p.source !== 'json',
    },
    jsonData: {
      label: 'Lottie JSON',
      group: CONTENT,
      type: 'textarea',
      when: (p: any) => p.source === 'json',
    },
    trigger: {
      label: 'Trigger',
      group: CONTENT,
      type: 'select',
      options: [
        { label: 'On Load', value: 'load' },
        { label: 'When in View', value: 'view' },
        { label: 'On Hover', value: 'hover' },
        { label: 'On Page Scroll', value: 'scroll' },
      ],
    },
    loop: { label: 'Loop', group: CONTENT, type: 'toggle' },
    speed: { label: 'Speed', group: CONTENT, type: 'number' },
    width: { label: 'Width (px)', group: CONTENT, type: 'number' },
    height: { label: 'Height (px)', group: CONTENT, type: 'number' },
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
    ...contentSectionControls(),
  },
  defaults: {
    source: 'url',
    url: '/lottie/pulse.json',
    trigger: 'load',
    loop: true,
    speed: 1,
    width: 300,
    height: 300,
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'sm' },
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
  ColumnBlock,
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
  OverlayCloseBlock,
  LightboxImageBlock,
  HeadingBlock,
  DividerBlock,
  IconBlock,
  IconBoxBlock,
  ImageBoxBlock,
  CounterBlock,
  ProgressBarBlock,
  StarRatingBlock,
  CountdownBlock,
  FlipBoxBlock,
  AnimatedHeadlineBlock,
  PriceListBlock,
  TableOfContentsBlock,
  BreadcrumbsBlock,
  TestimonialCarouselBlock,
  HotspotBlock,
  LottieBlock,
];
export const PAGE_ROOT_FIELDS = {
  maxWidth: {
    type: 'select',
    label: 'Content width',
    tab: 'style',
    section: 'Layout',
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
    tab: 'style',
    section: 'Appearance',
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
    tab: 'style',
    section: 'Layout',
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
    tab: 'advanced',
    section: 'Motion',
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
      'Container',
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
      'Container',
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
  basic: {
    title: 'Basic',
    components: [
      'Icon',
      'IconBox',
      'ImageBox',
      'Counter',
      'ProgressBar',
      'StarRating',
      'Countdown',
      'FlipBox',
      'AnimatedHeadline',
      'PriceList',
      'TableOfContents',
      'Breadcrumbs',
      'TestimonialCarousel',
      'Hotspot',
      'Lottie',
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
