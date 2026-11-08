/**
 * Builder content for the seeded pages. Together the pages use every block
 * that can appear on a page, so each one can be seen rendered on the site.
 */
import type { BuilderData } from '@/builder/data';
import { GUIDE_PDF_PATH, GUIDE_PRINT_PATH } from '@/content/user-guide';
import { block, page, titled } from '../builder-nodes';

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const SEED_IMAGES = {
  office: img('photo-1497366216548-37526070297c'),
  team: img('photo-1522071820081-009f0129c71c'),
  laptop: img('photo-1498050108023-c5249f4df085'),
  desk: img('photo-1499951360447-b19be8fe80f5'),
  meeting: img('photo-1552664730-d307ca884978'),
  person1: img('photo-1494790108377-be9c29b29330', 400),
  person2: img('photo-1500648767791-00dcc994a43e', 400),
  person3: img('photo-1438761681033-6461ffad8d80', 400),
};

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

export type SeedPageDef = {
  title: string;
  slug: string;
  isHome?: boolean;
  isBlogIndex?: boolean;
  status: 'published' | 'draft' | 'review';
  description: string;
  content: BuilderData;
};

function home(): BuilderData {
  return page([
    block('Hero', {
      badge: 'Seeded demo',
      title: 'Build, publish, and grow with Next CMS',
      subtitle: 'A visual page builder, a blog, collections, and a full user guide — all in this demo site.',
      primaryButtonText: 'Read the user guide',
      primaryButtonLink: '/user-guide',
      secondaryButtonText: 'See every component',
      secondaryButtonLink: '/components',
      imageUrl: SEED_IMAGES.office,
      imageAlt: 'A bright modern office',
    }),
    block('Features', {
      eyebrow: 'Why Next CMS',
      title: 'Everything a content team needs',
      subtitle: 'From the first draft to analytics.',
      columns: 3,
      items: [
        { icon: 'layout', title: 'Visual builder', description: 'Drag blocks onto the canvas and see the real page as you edit.' },
        { icon: 'file-text', title: 'Blog and archives', description: 'Posts, categories, tags, and templates for every listing.' },
        { icon: 'database', title: 'Collections', description: 'Structured content with fields, entries, and an API.' },
        { icon: 'globe', title: 'Multi-site', description: 'Run several sites and languages from one dashboard.' },
        { icon: 'shield', title: 'Roles and review', description: 'Permissions per role and an approval queue.' },
        { icon: 'bar-chart', title: 'Analytics', description: 'Page views, top content, and A/B experiments.' },
      ],
    }),
    block('Stats', {
      headline: 'The demo in numbers',
      items: [
        { value: '59', label: 'Builder blocks', change: '' },
        { value: '40+', label: 'Guide articles', change: '' },
        { value: '4', label: 'Site templates', change: '' },
        { value: '1', label: 'PDF guide', change: '' },
      ],
    }),
    block('Testimonials', {
      eyebrow: 'Kind words',
      title: 'Teams ship pages faster',
      items: [
        { quote: 'We rebuilt our marketing site in a week without a developer.', author: 'Maya Chen', role: 'Head of Marketing', company: 'Northwind' },
        { quote: 'Templates and global blocks keep every page on brand.', author: 'Daniel Ortiz', role: 'Design Lead', company: 'Contoso' },
        { quote: 'The review queue means nothing goes live by accident.', author: 'Priya Natarajan', role: 'Editor', company: 'Fabrikam' },
      ],
    }),
    block('CTA', {
      badge: 'Next step',
      title: 'Learn every screen in the user guide',
      description: 'Read it as blog posts, on one printable page, or as a PDF.',
      primaryButtonText: 'Open the guide',
      primaryButtonLink: '/user-guide',
      secondaryButtonText: 'Download PDF',
      secondaryButtonLink: GUIDE_PDF_PATH,
      variant: 'gradient',
    }),
  ]);
}

function about(): BuilderData {
  return page([
    block('Hero', {
      badge: 'About',
      title: 'We help teams publish with confidence',
      subtitle: 'Next CMS is a headless CMS and visual page builder.',
      primaryButtonText: 'Contact us',
      primaryButtonLink: '/contact',
      secondaryButtonText: '',
      secondaryButtonLink: '',
      imageUrl: SEED_IMAGES.team,
      imageAlt: 'A team working together',
    }),
    block('RichText', {
      content:
        '<h2>Our story</h2><p>Next CMS started as an internal tool for a small agency that was tired of rebuilding the same pages. Today it powers marketing sites, blogs, and documentation for teams of every size.</p><p>We believe editors should see what they publish, developers should own the components, and nobody should need a ticket to change a headline.</p>',
      width: 'normal',
    }),
    block('Team', {
      eyebrow: 'People',
      title: 'Meet the team',
      items: [
        { photo: SEED_IMAGES.person1, name: 'Ava Thompson', role: 'Founder' },
        { photo: SEED_IMAGES.person2, name: 'Leo Martins', role: 'Engineering' },
        { photo: SEED_IMAGES.person3, name: 'Sara Ahmed', role: 'Design' },
      ],
    }),
    block('Timeline', {
      eyebrow: 'History',
      title: 'How we got here',
      items: [
        { date: '2023', title: 'First version', body: 'A page builder for one agency.' },
        { date: '2024', title: 'Blog and collections', body: 'Posts, archives, and structured content.' },
        { date: '2025', title: 'Multi-site', body: 'Several sites and languages in one install.' },
        { date: '2026', title: 'Custom engine', body: 'A faster editor built in-house.' },
      ],
    }),
  ]);
}

function pricing(): BuilderData {
  return page([
    block('Pricing', {
      eyebrow: 'Pricing',
      title: 'Simple plans for every team',
      subtitle: 'Start free, upgrade when you grow.',
      showToggle: true,
      plans: [
        { name: 'Starter', price: '$0', period: '/month', description: 'For personal sites.', features: [{ text: '1 site' }, { text: 'Visual builder' }, { text: 'Blog' }], buttonText: 'Start free', buttonLink: '/contact', popular: false },
        { name: 'Team', price: '$29', period: '/month', description: 'For growing teams.', features: [{ text: '3 sites' }, { text: 'Roles and review' }, { text: 'Analytics' }], buttonText: 'Start trial', buttonLink: '/contact', popular: true },
        { name: 'Business', price: '$99', period: '/month', description: 'For organisations.', features: [{ text: 'Unlimited sites' }, { text: 'API and webhooks' }, { text: 'Priority support' }], buttonText: 'Talk to sales', buttonLink: '/contact', popular: false },
      ],
    }),
    block('FAQ', {
      eyebrow: 'FAQ',
      title: 'Questions about plans',
      items: [
        { question: 'Can I change plans later?', answer: 'Yes. Upgrades apply immediately and downgrades at the end of the billing period.' },
        { question: 'Is there a free trial?', answer: 'The Team plan has a 14-day free trial.' },
        { question: 'Do you offer discounts?', answer: 'Non-profits and education get 50% off.' },
      ],
    }),
  ]);
}

function contact(contactFormId: string): BuilderData {
  return page([
    block('Hero', {
      badge: 'Contact',
      title: 'Talk to us',
      subtitle: 'Send a message and we will reply within one business day.',
      primaryButtonText: '',
      primaryButtonLink: '',
      secondaryButtonText: '',
      secondaryButtonLink: '',
      alignment: 'center',
    }),
    block('Columns', {
      layout: '2-1',
      columns: [
        block('Column', {
          width: '2fr',
          content: [block('GlobalRef', { globalBlockId: contactFormId })],
        }),
        block('Column', {
          width: '1fr',
          content: [
            block('RichText', {
              content: '<h3>Office</h3><p>1 Example Street<br>Dhaka 1212</p><h3>Email</h3><p><a href="mailto:hello@example.com">hello@example.com</a></p>',
              width: 'full',
            }),
          ],
        }),
      ],
    }),
    block('Map', { address: 'Gulshan Avenue, Dhaka' }),
  ]);
}

function blog(): BuilderData {
  return page([
    block('RichText', {
      content: '<h1>Blog</h1><p>News, tutorials, and the complete user guide.</p>',
      width: 'normal',
    }),
    block('QueryFilter', { targetLoopId: 'blog-loop' }),
    block('QueryLoop', {
      loopId: 'blog-loop',
      source: 'posts',
      title: '',
      layout: 'grid',
      columnsDesktop: 3,
      pageSize: 12,
    }),
  ]);
}

function userGuideHub(): BuilderData {
  return page([
    block('Hero', {
      badge: 'Documentation',
      title: 'Next CMS user guide',
      subtitle: 'One article for every dashboard screen, public route, and builder component.',
      primaryButtonText: 'Download PDF',
      primaryButtonLink: GUIDE_PDF_PATH,
      secondaryButtonText: 'Printable version',
      secondaryButtonLink: GUIDE_PRINT_PATH,
      alignment: 'center',
    }),
    block('QueryLoop', {
      loopId: 'guide-loop',
      source: 'posts',
      title: 'All guide articles',
      lockedCategory: 'user-guide',
      sortField: 'title',
      sortOrder: 'asc',
      layout: 'list',
      pageSize: 60,
      pagination: 'none',
      showImage: false,
      showAuthor: false,
      showDate: false,
    }),
  ]);
}

/** One section per insert-panel category, using every page block. */
function components(ctaGlobalId: string): BuilderData {
  const tabsChild = (text: string) => [block('RichText', { content: `<p>${text}</p>`, width: 'full' })];
  return page([
    block('Hero', {
      badge: 'Components',
      title: 'Every builder block on one page',
      subtitle: 'Each section below shows one category from the insert panel.',
      primaryButtonText: 'Read the component guide',
      primaryButtonLink: '/blog/category/builder-components',
      secondaryButtonText: '',
      secondaryButtonLink: '',
      alignment: 'center',
    }),
    ...titled('Heroes and calls to action', 'Hero (above) and CTA.', block('CTA', { title: 'A call to action', description: 'Use one at the end of a page.', variant: 'subtle' })),
    ...titled('Marketing', 'Features, Stats, Pricing, Testimonials, FAQ, Logo cloud, Team, Timeline.', block('Features', { title: 'Features block' })),
    block('Stats', { headline: 'Stats block' }),
    block('Pricing', { title: 'Pricing block' }),
    block('Testimonials', { title: 'Testimonials block' }),
    block('FAQ', { title: 'FAQ block' }),
    block('LogoCloud', {
      title: 'Logo cloud block',
      items: ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin'].map(name => ({
        url: `https://placehold.co/160x48?text=${name}`,
        alt: name,
        link: '',
      })),
    }),
    block('Team', {
      title: 'Team block',
      items: [
        { photo: SEED_IMAGES.person1, name: 'Ava Thompson', role: 'Founder' },
        { photo: SEED_IMAGES.person2, name: 'Leo Martins', role: 'Engineering' },
      ],
    }),
    block('Timeline', {
      title: 'Timeline block',
      items: [
        { date: 'Step 1', title: 'Plan', body: 'Sketch the page.' },
        { date: 'Step 2', title: 'Build', body: 'Drag in blocks.' },
        { date: 'Step 3', title: 'Publish', body: 'Go live.' },
      ],
    }),
    ...titled('Content', 'Rich text, Image, Gallery, Video, Video library, Embed, Map, Code, Newsletter.', block('Image', { url: SEED_IMAGES.desk, alt: 'A tidy desk', caption: 'Image block with a caption', aspect: '16/9' })),
    block('Gallery', {
      title: 'Gallery block',
      items: [SEED_IMAGES.office, SEED_IMAGES.laptop, SEED_IMAGES.meeting].map((url, i) => ({ url, alt: `Gallery image ${i + 1}`, caption: '' })),
    }),
    block('Video', { url: YOUTUBE }),
    block('VideoLibrary', { title: 'Video library block' }),
    block('Embed', { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }),
    block('Map', { address: 'Dhaka, Bangladesh' }),
    block('Code', { code: "import { block } from '@/db/seed/builder-nodes';\n\nblock('Hero', { title: 'Hello' });" }),
    block('Newsletter', { title: 'Newsletter block', subtitle: 'Get one email a month.' }),
    ...titled('Contact form', 'A Contact form block placed directly on the page.', block('ContactForm', { title: 'Contact form block' })),
    ...titled('Blog and listings', 'Query filter, Query loop with a card made of Loop item fields, and Blog posts.', block('QueryFilter', { targetLoopId: 'components-loop' })),
    block('QueryLoop', {
      loopId: 'components-loop',
      source: 'posts',
      title: 'Query loop block',
      pageSize: 3,
      pagination: 'none',
      card: [
        block('LoopItemField', { field: 'image' }),
        block('LoopItemField', { field: 'title' }),
        block('LoopItemField', { field: 'excerpt', linkToItem: false }),
        block('LoopItemField', { field: 'readMore' }),
      ],
    }),
    block('BlogPosts', { title: 'Blog posts block', pageSize: 3, showSearch: false, showCategoryFilter: false, showTagFilter: false, showSort: false, showPagination: false }),
    ...titled('Layout', 'Container, Columns, Slider, Tabs, Accordion, Button, Spacer, Image morph.', block('Container', {
      content: [
        block('Button', { label: 'Primary button', link: '/contact', alignment: 'left' }),
        block('Button', { label: 'Read the guide', link: '/user-guide', alignment: 'left' }),
      ],
    })),
    block('Columns', {
      layout: '1-1-1',
      columns: [
        block('Column', {
          width: 'fill',
          content: [block('RichText', { content: '<h3>Column one</h3><p>Columns stack on mobile.</p>', width: 'full' })],
        }),
        block('Column', {
          width: 'fill',
          content: [block('RichText', { content: '<h3>Column two</h3><p>Pick a ratio such as 2-1.</p>', width: 'full' })],
        }),
        block('Column', {
          width: 'fill',
          content: [block('RichText', { content: '<h3>Column three</h3><p>Any block fits inside.</p>', width: 'full' })],
        }),
      ],
    }),
    block('Slider', {
      items: [
        { title: 'Slide 1', content: [block('Image', { url: SEED_IMAGES.office, alt: 'Office' })] },
        { title: 'Slide 2', content: [block('Image', { url: SEED_IMAGES.laptop, alt: 'Laptop' })] },
      ],
    }),
    block('Tabs', {
      items: [
        { label: 'Design', content: tabsChild('Tabs switch between panels of blocks.') },
        { label: 'Build', content: tabsChild('Each tab can hold any blocks.') },
      ],
    }),
    block('Accordion', {
      items: [
        { title: 'What is an accordion?', content: tabsChild('Collapsible panels for optional content.') },
        { title: 'Can panels hold blocks?', content: tabsChild('Yes, any block.') },
      ],
    }),
    block('Spacer', { height: 48 }),
    block('ImageMorph', {
      morph: {
        effect: 'image',
        image: { url: SEED_IMAGES.meeting, opacity: 1, zoom: 1, posX: 50, posY: 50 },
        shape: { type: 'default' },
        timing: { easing: 'ease-in-out', direction: 'normal', loop: false, duration: 0.6, delay: 0, endDelay: 0 },
      },
    }),
    ...titled('Global blocks', 'A Global block element showing the shared “Standard CTA banner”.', block('GlobalRef', { globalBlockId: ctaGlobalId })),
    ...titled('Custom', 'Blocks registered by developers in src/builder/custom.', block('UiBadge', {})),
    block('UiCard', {}),
    block('RichText', {
      content: '<p>Header, footer, and post blocks live in their own templates: see the site header and footer, any blog post, and the archive and search pages.</p>',
      width: 'normal',
    }),
  ]);
}

function legal(title: string, body: string): BuilderData {
  return page([block('RichText', { content: `<h1>${title}</h1>${body}`, width: 'normal' })]);
}

function teamMemberTemplate(): BuilderData {
  return page([
    block('CollectionItem', { field: 'photo', layout: 'card', showLabel: false }),
    block('CollectionItem', { field: 'name', layout: 'card', textSize: 'xl', showLabel: false }),
    block('CollectionItem', { field: 'role', layout: 'card', showLabel: true }),
    block('CollectionItem', { field: 'bio', layout: 'card', showLabel: false }),
  ]);
}

export function seedPageDefs(ids: { contactFormId: string; ctaGlobalId: string }): SeedPageDef[] {
  return [
    { title: 'Home', slug: 'home', isHome: true, status: 'published', description: 'Next CMS demo home page.', content: home() },
    { title: 'About', slug: 'about', status: 'published', description: 'Who we are.', content: about() },
    { title: 'Pricing', slug: 'pricing', status: 'published', description: 'Plans and prices.', content: pricing() },
    { title: 'Contact', slug: 'contact', status: 'published', description: 'Get in touch.', content: contact(ids.contactFormId) },
    { title: 'Blog', slug: 'blog', isBlogIndex: true, status: 'published', description: 'News, tutorials, and the user guide.', content: blog() },
    { title: 'Components', slug: 'components', status: 'published', description: 'Every builder block on one page.', content: components(ids.ctaGlobalId) },
    { title: 'User guide', slug: 'user-guide', status: 'published', description: 'The complete Next CMS user guide.', content: userGuideHub() },
    {
      title: 'Privacy',
      slug: 'privacy',
      status: 'published',
      description: 'Privacy policy.',
      content: legal('Privacy policy', '<p>This demo site stores only what you submit through its forms. Analytics use an anonymous visitor id.</p><h2>Contact</h2><p>Questions? Use the <a href="/contact">contact page</a>.</p>'),
    },
    {
      title: 'Terms',
      slug: 'terms',
      status: 'published',
      description: 'Terms of use.',
      content: legal('Terms of use', '<p>This is demo content created by the seed script. Replace it with your own terms before going live.</p>'),
    },
    { title: 'Team member', slug: 'team-member', status: 'published', description: 'Template page for Team collection entries.', content: teamMemberTemplate() },
    {
      title: 'Roadmap (in review)',
      slug: 'roadmap',
      status: 'review',
      description: 'A page waiting in the review queue.',
      content: legal('Roadmap', '<p>This draft is waiting for an editor to approve it in the review queue.</p>'),
    },
    {
      title: 'Careers (draft)',
      slug: 'careers',
      status: 'draft',
      description: 'An unpublished draft page.',
      content: legal('Careers', '<p>We are not hiring yet. This page is a draft.</p>'),
    },
  ];
}
