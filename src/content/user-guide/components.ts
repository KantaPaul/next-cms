import { BLOCK_INFO } from '@/builder/definitions/info';
import type { GuideTopic } from './types';

type BlockNote = { label: string; use: string; settings: string };

/** Hand-written usage notes for every insertable block. */
const BLOCKS: Record<string, BlockNote> = {
  Hero: {
    label: 'Hero',
    use: 'Open a page with a headline, a short pitch, and one or two buttons.',
    settings:
      'Badge, title, subtitle, button labels and links, image, alignment.',
  },
  CTA: {
    label: 'Call to action',
    use: 'Ask visitors to take one clear next step, usually near the end of a page.',
    settings:
      'Badge, title, description, two buttons, variant (gradient, primary, subtle).',
  },
  Features: {
    label: 'Features',
    use: 'Explain what your product does in short, scannable items.',
    settings:
      'Eyebrow, title, subtitle, columns, items with icon, title, description, and popup/drawer trigger.',
  },
  Stats: {
    label: 'Stats',
    use: 'Back up a claim with a few strong numbers.',
    settings: 'Headline, items with value, label, and change.',
  },
  Pricing: {
    label: 'Pricing',
    use: 'Compare plans side by side.',
    settings:
      'Monthly/yearly toggle, plans with price, features, button, and a highlighted plan.',
  },
  Testimonials: {
    label: 'Testimonials',
    use: 'Show what customers say about you.',
    settings:
      'Quote, author, role, company, and popup/drawer trigger per item; optional slider mode with autoplay, loop, gap, and per-device visible slides.',
  },
  FAQ: {
    label: 'FAQ',
    use: 'Answer common questions without a wall of text.',
    settings: 'Question and answer per item.',
  },
  LogoCloud: {
    label: 'Logo cloud',
    use: 'Show customers or partners at a glance.',
    settings:
      'Title, logo items with link, and optional slider mode with autoplay, loop, gap, and per-device visible slides.',
  },
  Team: {
    label: 'Team',
    use: 'Introduce the people behind the site.',
    settings:
      'Photo, name, role, and popup/drawer trigger per member; columns or optional slider mode with autoplay, loop, gap, and per-device visible slides.',
  },
  Timeline: {
    label: 'Timeline',
    use: 'Tell a story in steps or show a roadmap.',
    settings: 'Date, title, and text per milestone.',
  },
  RichText: {
    label: 'Rich text',
    use: 'Headings, paragraphs, lists, and links. Edit the text directly on the canvas.',
    settings: 'Content and width.',
  },
  Image: {
    label: 'Image',
    use: 'A single picture with alt text and an optional caption or link.',
    settings:
      'Image, alt, caption, aspect ratio, size, fit, link, or popup/drawer trigger.',
  },
  Gallery: {
    label: 'Gallery',
    use: 'A grid of images that open in a <a href="#guide-blocks-content">lightbox</a>.',
    settings:
      'Columns, gap, images, and popup/drawer trigger with per-image override.',
  },
  LightboxImage: {
    label: 'Lightbox image',
    use: 'Displays the clicked picture from an Image or Gallery block inside a popup or drawer, with navigation, zoom, and thumbnails.',
    settings:
      'Fallback image, navigation arrows and counter, zoom, caption position, thumbnails, and element styles.',
  },
  Video: {
    label: 'Video',
    use: 'Embed one YouTube, Vimeo, or file video.',
    settings: 'Video URL, or popup/drawer trigger with poster image.',
  },
  VideoLibrary: {
    label: 'Video library',
    use: 'A browsable list of videos from your playlists.',
    settings: 'Sources, title, search, layout, playlist, page size.',
  },
  Embed: {
    label: 'Embed',
    use: 'Third-party widgets such as a booking calendar. The HTML is sanitized.',
    settings: 'Embed URL.',
  },
  Map: { label: 'Map', use: 'Show where you are.', settings: 'Address.' },
  Code: {
    label: 'Code',
    use: 'Share a code snippet with syntax highlighting and a copy button.',
    settings: 'The code to show.',
  },
  Newsletter: {
    label: 'Newsletter',
    use: 'Collect email sign-ups.',
    settings: 'Title and subtitle.',
  },
  ContactForm: {
    label: 'Contact form',
    use: 'A form whose submissions land in the Contact forms inbox.',
    settings:
      'Title, fields (label, name, type, required), submit text, success message.',
  },
  QueryLoop: {
    label: 'Query loop',
    use: 'List posts, pages, collection entries, or videos and design the card yourself.',
    settings:
      'Source, layout (grid, list, masonry, carousel, table), columns per device, sorting, page size, pagination, locked category or tag; a Card slot and an Empty state slot.',
  },
  QueryFilter: {
    label: 'Query filter',
    use: 'Search, category, tag, and sort controls for a Query loop on the same page.',
    settings: 'Target loop id and which controls to show.',
  },
  LoopItemField: {
    label: 'Loop item field',
    use: 'Inside a Query loop card: show one field of the current item.',
    settings:
      'Field (title, excerpt, image, date, author, terms, read more, custom) and link to item.',
  },
  SearchResults: {
    label: 'Search results',
    use: 'The results list on the Search template.',
    settings:
      'Title, placeholder, tabs, thumbnails, type badges, snippets, page size.',
  },
  BlogPosts: {
    label: 'Blog posts',
    use: 'A ready-made list of recent posts with optional filters. Use Query loop when you need a custom card.',
    settings: 'Layout, columns, page size, filters, locked category or tag.',
  },
  Container: {
    label: 'Container',
    use: 'A flex or grid box that holds any blocks. The building block of custom layouts.',
    settings:
      'Mode (flex/grid), direction, gap, alignment per device, HTML tag.',
  },
  Columns: {
    label: 'Columns',
    use: 'Two to four columns side by side that stack on mobile. Each column is a selectable Column block that can be styled and resized.',
    settings: 'Ratio (1-1, 1-1-1, 2-1…), gap, vertical alignment.',
  },
  Slider: {
    label: 'Slider',
    use: 'Slides with arrows and dots; each slide holds any blocks.',
    settings: 'Slides; each slide holds any blocks.',
  },
  Tabs: {
    label: 'Tabs',
    use: 'Switch between panels of content.',
    settings: 'Tab labels; each tab holds any blocks.',
  },
  Accordion: {
    label: 'Accordion',
    use: 'Collapsible panels for long or optional content.',
    settings: 'Panel titles; each panel holds any blocks.',
  },
  Button: {
    label: 'Button',
    use: 'A link styled as a button.',
    settings: 'Label, link, alignment.',
  },
  Spacer: {
    label: 'Spacer',
    use: 'Add vertical breathing room.',
    settings: 'Height.',
  },
  ImageMorph: {
    label: 'Image morph',
    use: 'Images that blend into one another as the visitor scrolls.',
    settings: 'Morph images, with optional popup/drawer trigger.',
  },
  CollectionItem: {
    label: 'Collection item',
    use: 'On a collection template page: show a field of the current entry.',
    settings: 'Field, layout, label, text size, alignment.',
  },
  GlobalRef: {
    label: 'Global block',
    use: 'Place a shared global block or contact form. Edit the original once and every page updates.',
    settings: 'Which global block.',
  },
  PostTitle: {
    label: 'Post title',
    use: 'The current post’s title, optionally with excerpt and back link.',
    settings: 'Back link, excerpt, alignment.',
  },
  PostFeaturedImage: {
    label: 'Featured image',
    use: 'The current post’s featured image.',
    settings: 'Aspect ratio.',
  },
  PostMeta: {
    label: 'Post meta',
    use: 'Author, date, categories, and tags of the current post.',
    settings: 'Which parts to show.',
  },
  PostContent: {
    label: 'Post content',
    use: 'The body of the current post. Every post template needs one.',
    settings: 'Width.',
  },
  RelatedPosts: {
    label: 'Related posts',
    use: 'More posts that share categories or tags.',
    settings: 'Title, limit, columns.',
  },
  HeaderBar: {
    label: 'Header bar',
    use: 'The main header row with left, centre, and right areas.',
    settings: 'Width, layout, background, padding, height, border.',
  },
  HeaderColumns: {
    label: 'Header columns',
    use: 'A header split into up to six columns.',
    settings: 'Columns, gap, stacking breakpoint.',
  },
  Logo: {
    label: 'Logo',
    use: 'Your logo, linking home. Can swap for dark mode and sticky headers.',
    settings: 'Source, images, width, link, site name.',
  },
  NavMenu: {
    label: 'Nav menu',
    use: 'Links from a menu location, with dropdowns.',
    settings:
      'Menu location, orientation, depth, dropdown trigger, active style.',
  },
  MobileMenu: {
    label: 'Mobile menu',
    use: 'A hamburger menu for small screens.',
    settings: 'Breakpoint, drawer side, menu location, icon, search.',
  },
  SearchBox: {
    label: 'Search box',
    use: 'A search field that opens /search.',
    settings: 'Mode, placeholder, live results, alignment.',
  },
  AnnouncementBar: {
    label: 'Announcement bar',
    use: 'A thin notice above the header, such as a sale or launch.',
    settings: 'Text, link, dismissible, and a start and end date.',
  },
  SocialIcons: {
    label: 'Social icons',
    use: 'Links to your social profiles.',
    settings: 'Networks and URLs, shape, size.',
  },
  ContactInfo: {
    label: 'Contact info',
    use: 'Phone, email, and address.',
    settings: 'Items, icons, layout, alignment.',
  },
  ThemeToggle: {
    label: 'Theme toggle',
    use: 'Lets visitors switch between light and dark mode.',
    settings: 'Button style.',
  },
  LanguageSwitcher: {
    label: 'Language switcher',
    use: 'Switch between the site’s languages.',
    settings:
      'It lists the site’s languages. Style the current language and the links.',
  },
  FooterColumns: {
    label: 'Footer columns',
    use: 'The footer layout, split into up to six columns.',
    settings: 'Columns and gap.',
  },
  FooterLinks: {
    label: 'Footer links',
    use: 'A titled group of links, from a menu or typed in.',
    settings: 'Heading, source, menu location, links.',
  },
  Copyright: {
    label: 'Copyright',
    use: 'A copyright line. <code>{year}</code> and <code>{site_name}</code> are filled in for you.',
    settings: 'Text and alignment.',
  },
  LegalLinks: {
    label: 'Legal links',
    use: 'Privacy, terms, and cookie links.',
    settings: 'Source, menu location, links, separator.',
  },
  BackToTop: {
    label: 'Back to top',
    use: 'A button that scrolls to the top of the page.',
    settings: 'Position, when to appear, icon, label.',
  },
  UiBadge: {
    label: 'Badge',
    use: 'A small label such as “New”. A custom block example.',
    settings: 'Set in code.',
  },
  UiCard: {
    label: 'Card',
    use: 'A simple card with title and text. A custom block example.',
    settings: 'Set in code.',
  },
};

/** Insert-panel categories, in the order they appear in the editor. */
const CATEGORY_TOPICS: {
  key: string;
  title: string;
  intro: string;
  blocks: string[];
}[] = [
  {
    key: 'heroes',
    title: 'Heroes and calls to action',
    intro: 'Big, attention-grabbing sections for the top and bottom of a page.',
    blocks: ['Hero', 'CTA'],
  },
  {
    key: 'marketing',
    title: 'Marketing blocks',
    intro:
      'Sections that explain and sell: features, numbers, prices, and social proof.',
    blocks: [
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
  {
    key: 'content',
    title: 'Content blocks',
    intro: 'Text, media, and embeds for any page.',
    blocks: [
      'RichText',
      'Image',
      'Gallery',
      'LightboxImage',
      'Video',
      'VideoLibrary',
      'Embed',
      'Map',
      'Code',
      'Newsletter',
    ],
  },
  {
    key: 'contact',
    title: 'Contact form block',
    intro: 'Collect messages from visitors.',
    blocks: ['ContactForm'],
  },
  {
    key: 'blog',
    title: 'Blog and listing blocks',
    intro: 'Dynamic lists of posts, pages, collection entries, and videos.',
    blocks: [
      'QueryLoop',
      'QueryFilter',
      'LoopItemField',
      'SearchResults',
      'BlogPosts',
    ],
  },
  {
    key: 'layout',
    title: 'Layout blocks',
    intro:
      'Structure: boxes, columns, and interactive containers that hold other blocks.',
    blocks: [
      'Container',
      'Columns',
      'Slider',
      'Tabs',
      'Accordion',
      'Button',
      'Spacer',
      'ImageMorph',
    ],
  },
  {
    key: 'collections',
    title: 'Collection blocks',
    intro: 'Show data from collection entries.',
    blocks: ['CollectionItem'],
  },
  {
    key: 'global',
    title: 'Global blocks',
    intro: 'Reuse one section across many pages.',
    blocks: ['GlobalRef'],
  },
  {
    key: 'post',
    title: 'Post template blocks',
    intro:
      'Available in post templates and custom post layouts. They show the current post.',
    blocks: [
      'PostTitle',
      'PostFeaturedImage',
      'PostMeta',
      'PostContent',
      'RelatedPosts',
    ],
  },
  {
    key: 'header',
    title: 'Header blocks',
    intro: 'Available in header templates.',
    blocks: [
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
      'LanguageSwitcher',
    ],
  },
  {
    key: 'footer',
    title: 'Footer blocks',
    intro: 'Available in footer templates.',
    blocks: [
      'FooterColumns',
      'FooterLinks',
      'Copyright',
      'LegalLinks',
      'BackToTop',
    ],
  },
  {
    key: 'custom',
    title: 'Custom blocks',
    intro: 'Blocks added by developers in <code>src/builder/custom</code>.',
    blocks: ['UiBadge', 'UiCard'],
  },
];

/** Every block type documented in the guide. */
export const DOCUMENTED_BLOCKS = Object.keys(BLOCKS);

function blockSection(type: string) {
  const note = BLOCKS[type];
  const info = BLOCK_INFO[type];
  const capabilities = info?.capabilities?.length
    ? `<p><em>Can:</em> ${info.capabilities.join(' · ')}</p>`
    : '';
  return {
    heading: note.label,
    html: `<p>${note.use}</p><p><em>Settings:</em> ${note.settings}</p>${capabilities}`,
  };
}

export const COMPONENT_TOPICS: GuideTopic[] = CATEGORY_TOPICS.map(category => ({
  slug: `guide-blocks-${category.key}`,
  title: category.title,
  group: 'components',
  summary: category.intro,
  sections: [
    {
      heading: 'Every block also has',
      html: '<p>A <strong>Section</strong> group (padding, background, anchor, hide on mobile/tablet/desktop) and a <strong>Style</strong> group for colours, typography, borders, and spacing of its parts.</p>',
    },
    ...category.blocks.map(blockSection),
  ],
}));
