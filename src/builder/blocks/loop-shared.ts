import type { NormalizedListingItem } from '@nextcms/builder-core';

/** Shared by the server QueryLoop and the client LoopItemField. */

export const SAMPLE_LOOP_ITEMS: NormalizedListingItem[] = [
  {
    id: 'sample-1',
    title: 'Designing composable content architectures',
    slug: 'designing-composable-content',
    url: '/blog/designing-composable-content',
    excerpt:
      'How structured content models, reusable blocks, and server-rendered queries keep multi-site teams fast.',
    image:
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-10T00:00:00.000Z',
    author: { id: 'author-1', name: 'Alex Morgan', image: null },
    terms: [
      { id: 'cat-1', name: 'Engineering', slug: 'engineering', taxonomy: 'category' },
      { id: 'tag-1', name: 'Architecture', slug: 'architecture', taxonomy: 'tag' },
    ],
    source: 'posts',
    raw: { readingTime: '5 min read', featured: true },
  },
  {
    id: 'sample-2',
    title: 'Localized publishing workflows at scale',
    slug: 'localized-publishing-workflows',
    url: '/blog/localized-publishing-workflows',
    excerpt:
      'Best practices for translation groups, locale-aware search, and regional templates across global sites.',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-03-04T00:00:00.000Z',
    author: { id: 'author-2', name: 'Jamie Chen', image: null },
    terms: [
      { id: 'cat-2', name: 'Product', slug: 'product', taxonomy: 'category' },
      { id: 'tag-2', name: 'Localization', slug: 'localization', taxonomy: 'tag' },
    ],
    source: 'posts',
    raw: { readingTime: '4 min read', featured: false },
  },
  {
    id: 'sample-3',
    title: 'Accessible design systems for modern web apps',
    slug: 'accessible-design-systems',
    url: '/blog/accessible-design-systems',
    excerpt:
      'Building keyboard-navigable components, live region announcements, and high-contrast themes by default.',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    publishedAt: '2026-02-24T00:00:00.000Z',
    author: { id: 'author-3', name: 'Sam Rivera', image: null },
    terms: [
      { id: 'cat-3', name: 'Design', slug: 'design', taxonomy: 'category' },
      { id: 'tag-3', name: 'Accessibility', slug: 'accessibility', taxonomy: 'tag' },
    ],
    source: 'posts',
    raw: { readingTime: '6 min read', featured: true },
  },
];

export const formatLoopDate = (iso: string | null | undefined, language = 'en') => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(language, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
};
