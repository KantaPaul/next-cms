import { DEFAULT_SECTION } from './blocks/section';
import { isBuilderData, type BuilderData } from './data';

export type PostTerm = {
  id: string;
  name: string;
  slug: string;
  color?: string;
};

/** The post a single-post layout renders, passed to blocks as Puck metadata. */
export type PostView = {
  id: string;
  title: string;
  slug: string;
  language: string;
  excerpt: string | null;
  featuredImage: string | null;
  body: string;
  publishedAt: string | null;
  authorName: string | null;
  categories: PostTerm[];
  tags: PostTerm[];
  /** URL of the language's blog index page, when one is published. */
  blogUrl?: string | null;
};

/** A post as listed in cards (BlogPosts and RelatedPosts). */
export type PostCard = Omit<PostView, 'body' | 'blogUrl'> & { url: string };

export const SAMPLE_POST: PostView = {
  id: 'sample-post',
  title: 'How we rebuilt our publishing workflow',
  slug: 'sample-post',
  language: 'en',
  excerpt:
    'A short summary of the article appears here, under the title and in post cards.',
  featuredImage: null,
  body: '<p>This is sample copy. Each post that uses the shared template shows its own title, image, and article body in these blocks.</p><h2>A section heading</h2><p>Write posts in the rich-text editor on the post screen. The template decides where that body appears.</p>',
  publishedAt: new Date('2026-01-15T09:00:00Z').toISOString(),
  authorName: 'Jane Writer',
  categories: [{ id: 'sample-category', name: 'News', slug: 'news' }],
  tags: [
    { id: 'sample-tag', name: 'Product', slug: 'product', color: '#6366f1' },
  ],
  blogUrl: '/blog',
};

export const POST_BLOCK_TYPES = [
  'PostTitle',
  'PostFeaturedImage',
  'PostMeta',
  'PostContent',
  'RelatedPosts',
] as const;

/** Used whenever no single-post template has been published yet. */
export const defaultPostTemplate = (): BuilderData => ({
  root: {
    props: {
      maxWidth: 'lg',
      theme: 'site',
      paddingY: 'md',
      pageTransition: 'none',
    },
  },
  content: [
    {
      type: 'PostFeaturedImage',
      props: {
        id: 'PostFeaturedImage-default',
        aspect: 'wide',
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    },
    {
      type: 'PostTitle',
      props: {
        id: 'PostTitle-default',
        showBackLink: true,
        showExcerpt: true,
        alignment: 'left',
        section: { ...DEFAULT_SECTION, paddingY: 'none' },
      },
    },
    {
      type: 'PostMeta',
      props: {
        id: 'PostMeta-default',
        showDate: true,
        showAuthor: true,
        showCategories: true,
        showTags: true,
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    },
    {
      type: 'PostContent',
      props: {
        id: 'PostContent-default',
        width: 'normal',
        section: { ...DEFAULT_SECTION, paddingY: 'none' },
      },
    },
    {
      type: 'RelatedPosts',
      props: {
        id: 'RelatedPosts-default',
        title: 'Related posts',
        limit: 3,
        posts: [],
        section: { ...DEFAULT_SECTION, paddingY: 'md' },
      },
    },
  ],
  zones: {},
});

export const resolvePostTemplate = (value: unknown): BuilderData =>
  isBuilderData(value) && value.content.length ? value : defaultPostTemplate();
