import { DEFAULT_SECTION } from '@/builder/blocks/section';
import type { BuilderData, BuilderItem } from '@/builder/data';

const block = (
  type: string,
  id: string,
  props: Record<string, unknown>
): BuilderItem => ({
  type,
  props: { section: DEFAULT_SECTION, ...props, id },
});

const page = (content: BuilderItem[]): BuilderData => ({
  root: { props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' } },
  content,
  zones: {},
});

const saasLanding = page([
  block('Hero', 'tpl-saas-hero', {
    badge: 'Version 2.4 is out',
    title: 'Design visually. Ship flawlessly. Publish instantly.',
    subtitle:
      'A hybrid CMS that pairs a drag-and-drop page builder for landing pages with a rich-text editor for long-form content. Self-hosted, typed, and fast.',
    primaryButtonText: 'Start building free',
    primaryButtonLink: '/pricing',
    secondaryButtonText: 'Read the architecture deep dive',
    secondaryButtonLink: '/blog',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    imageAlt: 'Abstract gradient illustration',
    alignment: 'center',
    section: { ...DEFAULT_SECTION, paddingY: 'lg' },
  }),
  block('Stats', 'tpl-saas-stats', {
    headline: 'Engineered for performance and scale',
    items: [
      {
        value: '100/100',
        label: 'Lighthouse score',
        change: 'No runtime bloat',
      },
      { value: '< 30ms', label: 'Edge TTFB', change: 'Static revalidation' },
      { value: '12', label: 'Prebuilt blocks', change: 'Fully typed' },
      { value: '100%', label: 'Data ownership', change: 'Postgres + S3' },
    ],
    section: { ...DEFAULT_SECTION, paddingY: 'sm', background: 'muted' },
  }),
  block('Features', 'tpl-saas-features', {
    eyebrow: 'Architecture',
    title: 'Why engineers and content teams both love it',
    subtitle:
      'No more trade-offs between rigid headless schemas and messy page builders.',
    columns: 3,
    items: [
      {
        icon: 'Layers',
        title: 'Two editors, one model',
        description:
          'Use the visual builder for landing pages, or switch to rich text for articles.',
      },
      {
        icon: 'Sparkles',
        title: 'AI page generation',
        description:
          'Generate validated block trees from a brief, then polish the copy in seconds.',
      },
      {
        icon: 'History',
        title: 'Revisions and autosave',
        description:
          'Debounced autosave and one-click rollback to any earlier version.',
      },
      {
        icon: 'ShieldCheck',
        title: 'Editorial workflow',
        description:
          'Authors submit for review; editors approve, publish, or schedule.',
      },
      {
        icon: 'FolderKanban',
        title: 'Media library',
        description:
          'Folders, alt text, and direct integration with blocks and SEO.',
      },
      {
        icon: 'Globe',
        title: 'Headless REST API',
        description:
          'Read content anywhere with hashed API keys and rate limiting.',
      },
    ],
  }),
  block('Testimonials', 'tpl-saas-testimonials', {
    eyebrow: 'Customer stories',
    title: 'Loved by fast-moving teams',
    items: [
      {
        quote:
          'Our marketing team now designs and publishes landing pages without filing a single engineering ticket.',
        author: 'Elena Rostova',
        role: 'VP of Product',
        company: 'Veloce Cloud',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      },
      {
        quote:
          'Other tools force a choice between markdown and brittle drag-and-drop. This gives us both on one Postgres database.',
        author: 'Marcus Vance',
        role: 'Staff Frontend Architect',
        company: 'HyperScale Systems',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      },
    ],
  }),
  block('FAQ', 'tpl-saas-faq', {
    eyebrow: 'FAQ',
    title: 'Everything you need to know',
    items: [
      {
        question: 'Can I add my own React blocks?',
        answer:
          'Yes. Blocks are plain React components registered in the builder config with typed fields.',
      },
      {
        question: 'Where is media stored?',
        answer:
          'On local disk in development, or any S3-compatible provider through the storage adapter.',
      },
      {
        question: 'How do draft previews work?',
        answer:
          'Each page can have share links that render the draft without publishing it.',
      },
    ],
  }),
  block('CTA', 'tpl-saas-cta', {
    badge: 'Start in minutes',
    title: 'Transform how you publish',
    description:
      'Join teams building faster with a CMS that respects both designers and engineers.',
    primaryButtonText: 'See pricing',
    primaryButtonLink: '/pricing',
    secondaryButtonText: 'Read the docs',
    secondaryButtonLink: '/docs',
    variant: 'gradient',
  }),
]);

const pricing = page([
  block('Hero', 'tpl-pricing-hero', {
    badge: 'Transparent and predictable',
    title: 'Simple pricing. No seat licenses. No surprises.',
    subtitle:
      'Self-host the community edition for full control, or let us run it for you.',
    alignment: 'center',
    primaryButtonText: '',
    secondaryButtonText: '',
  }),
  block('Pricing', 'tpl-pricing-cards', {
    eyebrow: 'Plans',
    title: 'From side projects to enterprise',
    showToggle: true,
    plans: [
      {
        name: 'Community',
        price: '$0',
        yearlyPrice: '$0',
        period: 'forever free',
        description: 'Self-hosted and open source.',
        features: [
          'Unlimited pages and revisions',
          'Visual builder',
          'Rich-text editor',
          'Community support',
        ].map(text => ({ text })),
        buttonText: 'Deploy with Docker',
        buttonLink: '/docs',
        popular: false,
      },
      {
        name: 'Pro Cloud',
        price: '$29',
        yearlyPrice: '$290',
        period: 'per month',
        description: 'Managed hosting with backups and CDN.',
        features: [
          'Everything in Community',
          'AI page generator',
          '100 GB media storage',
          'Review workflow and audit log',
          'Priority email support',
        ].map(text => ({ text })),
        buttonText: 'Start 14-day trial',
        buttonLink: '/contact',
        popular: true,
      },
      {
        name: 'Enterprise',
        price: '$199',
        yearlyPrice: '$1,990',
        period: 'per month',
        description: 'SSO, SLAs, and dedicated support.',
        features: [
          'Everything in Pro Cloud',
          'Dedicated database',
          '99.99% SLA',
          'SAML / Google Workspace SSO',
        ].map(text => ({ text })),
        buttonText: 'Talk to sales',
        buttonLink: '/contact',
        popular: false,
      },
    ],
  }),
  block('FAQ', 'tpl-pricing-faq', {
    eyebrow: 'Pricing FAQ',
    title: 'Billing and deployment questions',
    items: [
      {
        question: 'Can I move from Community to Pro later?',
        answer:
          'Yes. Export your database and media and import them into a managed instance.',
      },
      {
        question: 'Are there API request limits?',
        answer:
          'Self-hosted installs have no artificial limits. Pro includes generous cached API traffic.',
      },
    ],
  }),
]);

const about = page([
  block('Hero', 'tpl-about-hero', {
    badge: 'Our mission',
    title: 'Content tools should never limit engineering freedom.',
    subtitle:
      'Marketers get the power of a visual builder; engineers keep clean code and typed components.',
    alignment: 'center',
    primaryButtonText: '',
    secondaryButtonText: '',
  }),
  block('Features', 'tpl-about-values', {
    eyebrow: 'What we value',
    title: 'Built on three principles',
    columns: 3,
    items: [
      {
        icon: 'Code2',
        title: 'Open-source roots',
        description:
          'React, Tailwind, Puck, and Tiptap. No proprietary lock-in.',
      },
      {
        icon: 'Zap',
        title: 'Extreme velocity',
        description: 'Ship campaign pages in hours with live visual editing.',
      },
      {
        icon: 'Shield',
        title: 'Enterprise ready',
        description:
          'Roles, revisions, review workflows, and audit logs from day one.',
      },
    ],
  }),
  block('Stats', 'tpl-about-stats', {
    headline: 'Milestones',
    items: [
      { value: '2019', label: 'Founded', change: '' },
      { value: '40', label: 'Team members', change: '' },
      { value: '2,000+', label: 'Teams onboard', change: '' },
      { value: '12', label: 'Countries', change: '' },
    ],
    section: { ...DEFAULT_SECTION, background: 'muted' },
  }),
  block('CTA', 'tpl-about-cta', {
    badge: 'Join us',
    title: 'Ready to build together?',
    description: 'See our open roles or try the builder yourself.',
    primaryButtonText: 'Open roles',
    primaryButtonLink: '/careers',
    secondaryButtonText: 'Contact us',
    secondaryButtonLink: '/contact',
    variant: 'gradient',
  }),
]);

const contact = page([
  block('Hero', 'tpl-contact-hero', {
    title: 'Talk to our team',
    subtitle:
      'Questions about plans, migrations, or a demo? We reply within one business day.',
    alignment: 'center',
    primaryButtonText: '',
    secondaryButtonText: '',
    section: { ...DEFAULT_SECTION, paddingY: 'md' },
  }),
  block('ContactForm', 'tpl-contact-form', {
    title: '',
    subtitle: '',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true },
      { label: 'Work email', name: 'email', type: 'email', required: true },
      { label: 'Company', name: 'company', type: 'text', required: false },
      {
        label: 'How can we help?',
        name: 'message',
        type: 'textarea',
        required: true,
      },
    ],
    submitText: 'Send message',
    successMessage: 'Thanks! We will be in touch soon.',
    actionUrl: '',
  }),
]);

const article = `<h2>Why code and the visual canvas must unite</h2>
<p>Over the past decade the web moved decisively toward headless CMS architecture. Developers celebrated decoupled frontends, while editorial teams were left with rigid form fields and disconnected preview windows.</p>
<h2>The problem with pure headless</h2>
<p>When a marketer assembles a homepage from isolated inputs, they have no spatial sense of spacing, wrapping, or mobile layouts. The result is a steady stream of requests to tweak CSS and build one-off templates.</p>
<blockquote><p>A great CMS is not a database with a web form; it is a creative medium for ideas.</p></blockquote>
<h2>Enter the hybrid editor</h2>
<p>A hybrid engine lets each page choose its editor: a visual builder for conversion-focused landing pages, and a rich-text editor for long-form articles and documentation.</p>
<h3>Why a visual builder for landing pages?</h3>
<p>The builder renders the real React components on the canvas, so every change to padding or headline style uses the same typed props that ship to production.</p>
<h3>Why rich text for articles?</h3>
<p>Long-form writing needs clean typography, keyboard shortcuts, lists, and code blocks, not a grid of draggable cards.</p>
<h2>Conclusion</h2>
<p>The future belongs to <strong>hybrid engines</strong> that respect both disciplines.</p>`;

const blogIndex = page([
  block('BlogPosts', 'tpl-blog-posts', {
    title: 'From the blog',
    subtitle: 'Product updates, guides, and stories from the team.',
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
    section: { ...DEFAULT_SECTION, paddingY: 'lg' },
  }),
]);

export const STARTER_TEMPLATES = [
  {
    key: 'saas-landing',
    name: 'SaaS high-conversion landing',
    description:
      'Hero with two CTAs, metrics, a six-card feature grid, testimonials, FAQ, and a closing CTA.',
    category: 'Landing',
    editorType: 'builder' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    content: saasLanding,
  },
  {
    key: 'pricing',
    name: 'Pricing and plan comparison',
    description:
      'Three pricing cards with a monthly/yearly toggle, feature checklists, and a FAQ.',
    category: 'Sales',
    editorType: 'builder' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
    content: pricing,
  },
  {
    key: 'about',
    name: 'Company story and values',
    description:
      'Mission headline, values grid, milestone stats, and a call to action.',
    category: 'Company',
    editorType: 'builder' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
    content: about,
  },
  {
    key: 'contact',
    name: 'Contact page',
    description: 'Short intro and a contact form wired to any form endpoint.',
    category: 'Company',
    editorType: 'builder' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=600&auto=format&fit=crop&q=80',
    content: contact,
  },
  {
    key: 'blog-index',
    name: 'Blog listing page',
    description:
      'A heading and a filterable grid of published posts with search, category, tag, and sort.',
    category: 'Blog',
    editorType: 'builder' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80',
    content: blogIndex,
  },
  {
    key: 'article',
    name: 'Long-form article',
    description:
      'Rich-text article layout with headings, a pull quote, and a conclusion.',
    category: 'Blog',
    editorType: 'richtext' as const,
    thumbnailUrl:
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=80',
    content: article,
  },
];

export const STARTER_GLOBAL_BLOCKS = [
  {
    name: 'Standard CTA banner',
    category: 'Call to action',
    content: [
      block('CTA', 'global-cta-standard', {
        badge: 'No vendor lock-in',
        title: 'Ready to modernize your content workflow?',
        description:
          'Deploy in minutes with Docker, Postgres, and your own storage.',
        primaryButtonText: 'Start free trial',
        primaryButtonLink: '/pricing',
        secondaryButtonText: 'View on GitHub',
        secondaryButtonLink: 'https://github.com',
        variant: 'gradient',
      }),
    ],
  },
  {
    name: 'Trust metrics bar',
    category: 'Social proof',
    content: [
      block('Stats', 'global-trust-stats', {
        headline: 'Trusted by world-class teams',
        items: [
          { value: '99.99%', label: 'Uptime SLA', change: '' },
          { value: '45ms', label: 'Edge TTFB', change: '' },
          { value: '25,000+', label: 'Pages served daily', change: '' },
          { value: '4.9/5', label: 'Developer satisfaction', change: '' },
        ],
        section: { ...DEFAULT_SECTION, paddingY: 'sm', background: 'muted' },
      }),
    ],
  },
];
