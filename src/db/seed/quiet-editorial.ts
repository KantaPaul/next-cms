/**
 * "Quiet Editorial" starter kit: post layout and home page. The header,
 * footer, archive and search starters live in `header-footer-starters.ts`;
 * the theme is `QUIET_EDITORIAL_THEME` in `builder/theme-presets.ts`.
 */
import { DEFAULT_SECTION } from '@/builder/blocks/section';
import type { BuilderData, BuilderItem } from '@/builder/data';

const sec = (paddingY: 'none' | 'sm' | 'md' | 'lg', extra: object = {}) => ({
  ...DEFAULT_SECTION,
  paddingY,
  ...extra,
});

const item = (
  type: string,
  id: string,
  props: Record<string, unknown>
): BuilderItem => ({ type, props: { ...props, id } }) as BuilderItem;

/** Single post: centred title, meta with reading time, wide image, drop-cap body, share, author, prev/next, related. */
export const editorialPostTemplate = (): BuilderData => ({
  root: {
    props: { maxWidth: 'xl', theme: 'site', paddingY: 'md', pageTransition: 'fade' },
  },
  content: [
    item('PostTitle', 'qe-post-title', {
      showBackLink: true,
      backLinkLabel: '← All dispatches',
      showExcerpt: true,
      alignment: 'center',
      section: sec('sm'),
    }),
    item('PostMeta', 'qe-post-meta', {
      showAuthor: true,
      showAvatar: true,
      showDate: true,
      showReadingTime: true,
      showCategories: true,
      showTags: false,
      section: sec('none'),
    }),
    item('PostFeaturedImage', 'qe-post-image', {
      aspect: 'wide',
      width: 'wide',
      section: sec('md'),
    }),
    item('PostContent', 'qe-post-content', {
      width: 'normal',
      dropCap: true,
      section: sec('none'),
    }),
    item('ShareButtons', 'qe-post-share', {
      label: 'Share',
      networks: 'default',
      align: 'left',
      width: 'normal',
      section: sec('md'),
    }),
    item('AuthorCard', 'qe-post-author', {
      heading: 'Written by',
      layout: 'horizontal',
      showSocial: true,
      showPostCount: true,
      showLatestPosts: true,
      latestCount: 3,
      viewAllLabel: 'View all dispatches',
      cardVariant: 'outline',
      width: 'normal',
      section: sec('sm'),
    }),
    item('PostNavigation', 'qe-post-nav', {
      previousLabel: 'Previous dispatch',
      nextLabel: 'Next dispatch',
      scope: 'all',
      layout: 'split',
      showDate: true,
      width: 'normal',
      section: sec('sm'),
    }),
    item('Comments', 'qe-post-comments', {
      heading: 'Dialogues & annotations',
      sort: 'oldest',
      showForm: true,
      formTitle: 'Add an annotation',
      submitLabel: 'Post comment',
      closedText: 'Comments are closed for this dispatch.',
      width: 'normal',
      section: sec('md'),
    }),
    item('RelatedPosts', 'qe-post-related', {
      title: 'Further reading',
      limit: 3,
      columns: 3,
      posts: [],
      section: sec('lg'),
    }),
  ],
  zones: {},
});

/** Home page: featured lead story grid, spotlight, editorial principles, newsletter. */
export const editorialHomePage = (): BuilderData => ({
  root: { props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' } },
  content: [
    item('QueryLoop', 'qe-home-dispatches', {
      loopId: 'qe-home',
      source: 'posts',
      eyebrow: 'Latest dispatches',
      title: 'Essays on material culture and spatial silence',
      subtitle: '',
      layout: 'featured',
      columnsDesktop: 3,
      columnsTablet: 2,
      columnsMobile: 1,
      gap: 'lg',
      pageSize: 7,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'none',
      cardVariant: 'outline',
      cardHover: true,
      showImage: true,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showTerms: true,
      emptyText: 'Publish a post to see it here.',
      section: sec('lg'),
    }),
    item('Hero', 'qe-home-spotlight', {
      badge: 'Featured plate',
      title: 'The Sanctuary at Värmland',
      subtitle:
        'A timber retreat where light, acoustics and stillness are the materials. Read the full register of the work.',
      primaryButtonText: 'Read the monograph',
      primaryButtonLink: '/blog',
      secondaryButtonText: 'View the archive',
      secondaryButtonLink: '/blog',
      imageUrl:
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1400&auto=format&fit=crop&q=80',
      imageAlt: 'Timber cabin in a pine forest at dusk',
      alignment: 'left',
      section: sec('lg', { background: 'muted' }),
    }),
    item('Features', 'qe-home-principles', {
      eyebrow: 'Editorial principles',
      title: 'What we look for',
      subtitle: '',
      columns: 3,
      showIcons: false,
      cardVariant: 'none',
      items: [
        {
          icon: 'BookOpen',
          title: 'Literary gravitas',
          description: 'Long-form writing that rewards a slow read.',
        },
        {
          icon: 'AudioLines',
          title: 'Acoustic reverberation',
          description: 'Spaces measured by how they sound, not only how they look.',
        },
        {
          icon: 'Gem',
          title: 'Quiet luxury',
          description: 'Material honesty over ornament; craft over spectacle.',
        },
      ],
      section: sec('lg'),
    }),
    item('Newsletter', 'qe-home-newsletter', {
      title: 'The monthly dispatch',
      text: 'One considered letter a month, with the new essays and a single photograph.',
      placeholder: 'you@example.com',
      submitText: 'Subscribe',
      successMessage: 'Thank you — you are on the list.',
      layout: 'centered',
      section: sec('lg', { background: 'muted', anchor: 'subscribe' }),
    }),
  ],
  zones: {},
});
