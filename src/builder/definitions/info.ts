/**
 * Insert-panel metadata for the native blocks: the one-line card text and the
 * details shown in the Elements view's hover preview. Kept apart from the
 * block definitions so they stay about props and rendering.
 */

import type { BlockDefinition, BlockInfo } from '@nextcms/builder-core';

const FULL = '100% × auto';

export const BLOCK_INFO: Record<string, BlockInfo> = {
  Hero: {
    description: 'Headline banner with copy and actions',
    capabilities: ['Eyebrow, title, and lead text', 'Primary and secondary buttons', 'Background image or color'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  CTA: {
    description: 'Prompt with a call-to-action button',
    capabilities: ['Title and supporting text', 'One or two buttons', 'Section background styles'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Features: {
    description: 'Grid of features with icons',
    capabilities: ['Icon, title, and text per item', 'Two to four columns', 'Responsive stacking'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Stats: {
    description: 'Key numbers with labels',
    capabilities: ['Value and label per stat', 'Even column layout'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Pricing: {
    description: 'Plans with prices and features',
    capabilities: ['Monthly and yearly toggle', 'Highlighted plan', 'Feature checklist per plan'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Testimonials: {
    description: 'Customer quotes with names',
    capabilities: ['Quote, author, and role', 'Avatar images'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  FAQ: {
    description: 'Questions with expandable answers',
    capabilities: ['Collapsible answers', 'Keyboard accessible'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  LogoCloud: {
    description: 'Row of partner or customer logos',
    capabilities: ['Image per logo', 'Optional grayscale'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Team: {
    description: 'People with photos and roles',
    capabilities: ['Photo, name, and role', 'Responsive grid'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Timeline: {
    description: 'Milestones in order',
    capabilities: ['Date, title, and text per step', 'Vertical layout'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Columns: {
    description: 'Two to four side-by-side columns',
    capabilities: ['Preset column ratios', 'Gap and vertical alignment', 'Stacks on mobile'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Container: {
    description: 'Flex or grid box for any blocks',
    capabilities: ['Flex and grid layouts', 'Per-device direction and alignment', 'Custom HTML tag'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Button: {
    description: 'Link styled as a button',
    capabilities: ['Label and link', 'Style variants and sizes'],
    semanticTag: 'a',
    defaultSize: 'auto × 40px',
  },
  Spacer: {
    description: 'Empty vertical space',
    capabilities: ['Adjustable height'],
    semanticTag: 'div',
    defaultSize: '100% × 48px',
  },
  ImageMorph: {
    description: 'Images that morph on scroll',
    capabilities: ['Several images', 'Scroll-driven transition'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Slider: {
    description: 'Slides with navigation',
    capabilities: ['Blocks inside each slide', 'Arrows, dots, and autoplay'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Tabs: {
    description: 'Content switched by tabs',
    capabilities: ['Blocks inside each tab', 'Keyboard navigation'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Accordion: {
    description: 'Collapsible panels',
    capabilities: ['Blocks inside each panel', 'Single or multiple open'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  RichText: {
    description: 'Formatted text and headings',
    capabilities: ['Headings, lists, and links', 'Inline formatting', 'Edit on the canvas'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Image: {
    description: 'Single image with alt text',
    capabilities: ['Media library picker', 'Alt text and caption', 'Responsive sizing'],
    semanticTag: 'figure',
    defaultSize: '100% × auto',
  },
  Gallery: {
    description: 'Grid of images',
    capabilities: ['Several images', 'Column count', 'Captions'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Video: {
    description: 'Embedded video player',
    capabilities: ['YouTube, Vimeo, or file URL', '16:9 responsive frame'],
    semanticTag: 'figure',
    defaultSize: '100% × 16:9',
  },
  VideoLibrary: {
    description: 'Browsable list of videos',
    capabilities: ['Playlist filter', 'Sidebar or stacked layout', 'Pagination'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  Embed: {
    description: 'Third-party embed code',
    capabilities: ['Embed by URL from allowed hosts', 'Responsive frame'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  Map: {
    description: 'Interactive location map',
    capabilities: ['Address lookup', 'OpenStreetMap embed'],
    semanticTag: 'div',
    defaultSize: '100% × 360px',
  },
  Code: {
    description: 'Code snippet with a copy button',
    capabilities: ['Monospace code block', 'Copy button'],
    semanticTag: 'pre',
    defaultSize: FULL,
  },
  Audio: {
    description: 'Audio file in a card with a player',
    capabilities: ['Title, caption and cover image', 'Browser audio controls'],
    semanticTag: 'figure',
    defaultSize: FULL,
  },
  Newsletter: {
    description: 'Email sign-up form',
    capabilities: ['Title and description', 'Email capture'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  ContactForm: {
    description: 'Form that sends messages',
    capabilities: ['Configurable fields', 'Spam protection', 'Submission emails'],
    semanticTag: 'form',
    defaultSize: FULL,
  },
  CollectionItem: {
    description: 'Field from the current collection item',
    capabilities: ['Bound to a collection field'],
    semanticTag: 'div',
    defaultSize: FULL,
  },
  GlobalRef: {
    description: 'Shared block synced across pages',
    capabilities: ['Edit once, update everywhere', 'Pick any saved global block'],
    semanticTag: 'div',
    nesting: 'leaf',
    defaultSize: FULL,
  },
  CollectionBlock: {
    description: 'Reusable block for this post type',
    capabilities: [
      'Designed in the post type block builder',
      'Shows the current entry’s fields when inserted',
      'Updates wherever the block is used',
    ],
    semanticTag: 'div',
    nesting: 'leaf',
    defaultSize: FULL,
  },
  LoopGrid: {
    description: 'Repeat a saved Loop Item template over posts or a post type',
    capabilities: [
      'Blog posts or any custom post type',
      'Reusable Loop Item templates with dynamic fields',
      'Field filters, ordering, and pagination',
      'Grid, list, masonry, or carousel',
    ],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  BlogPosts: {
    description: 'List of recent posts',
    capabilities: ['Category and tag filters', 'Grid or list layout', 'Pagination'],
    semanticTag: 'section',
    defaultSize: FULL,
  },
  PostTitle: { description: 'Title of the current post', semanticTag: 'h1', defaultSize: FULL },
  PostFeaturedImage: { description: 'Featured image of the post', semanticTag: 'figure', defaultSize: FULL },
  PostMeta: { description: 'Author, date, and reading time', semanticTag: 'div', defaultSize: FULL },
  PostContent: { description: 'Body of the current post', semanticTag: 'article', defaultSize: FULL },
  RelatedPosts: { description: 'Posts related to this one', semanticTag: 'section', defaultSize: FULL },
  AuthorBio: { description: 'The post author’s avatar, name, and bio', semanticTag: 'aside', defaultSize: FULL },
  ShareButtons: { description: 'Copy-link and social share buttons', semanticTag: 'div', defaultSize: FULL },
  PostNavigation: { description: 'Links to the previous and next post', semanticTag: 'nav', defaultSize: FULL },
  BookmarkButton: { description: 'Lets visitors save the post in their browser', semanticTag: 'div', defaultSize: FULL },
  HeaderBar: {
    description: 'Site header with logo and menu',
    capabilities: ['Logo, navigation, and actions', 'Sticky and transparent modes'],
    semanticTag: 'header',
    defaultSize: '100% × 64px',
  },
  HeaderColumns: { description: 'Header split into columns', semanticTag: 'header', defaultSize: '100% × 64px' },
  FooterColumns: { description: 'Footer split into columns', semanticTag: 'footer', defaultSize: FULL },
  Logo: { description: 'Site logo linking home', semanticTag: 'a', defaultSize: 'auto × 32px' },
  NavMenu: { description: 'Navigation links from a menu', semanticTag: 'nav', defaultSize: 'auto × auto' },
  MobileMenu: { description: 'Menu for small screens', semanticTag: 'nav', defaultSize: 'auto × auto' },
  SearchBox: { description: 'Site search field', semanticTag: 'form', defaultSize: '240px × 36px' },
  AnnouncementBar: { description: 'Thin notice above the header', semanticTag: 'div', defaultSize: '100% × 36px' },
  SocialIcons: { description: 'Links to social profiles', semanticTag: 'ul', defaultSize: 'auto × auto' },
  ContactInfo: { description: 'Phone, email, and address', semanticTag: 'address', defaultSize: 'auto × auto' },
  Copyright: { description: 'Copyright line with year', semanticTag: 'p', defaultSize: 'auto × auto' },
  FooterLinks: { description: 'Group of footer links', semanticTag: 'nav', defaultSize: 'auto × auto' },
  LegalLinks: { description: 'Privacy, terms, and similar links', semanticTag: 'nav', defaultSize: 'auto × auto' },
  BackToTop: { description: 'Button that scrolls to the top', semanticTag: 'button', defaultSize: '40px × 40px' },
  ThemeToggle: { description: 'Light and dark mode switch', semanticTag: 'button', defaultSize: '36px × 36px' },
  Bookmarks: { description: 'Saved-posts button and drawer (stored in the visitor’s browser)', semanticTag: 'div', defaultSize: '36px × 36px' },
  LanguageSwitcher: { description: 'Switch between site languages', semanticTag: 'div', defaultSize: 'auto × auto' },
};

/** Adds BLOCK_INFO to a definition; fields already on the definition win. */
export function withInfo(definition: BlockDefinition): BlockDefinition {
  const info = BLOCK_INFO[definition.type];
  return info ? { ...info, ...definition } : definition;
}
