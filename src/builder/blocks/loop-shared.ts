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
    hasGallery: true,
    galleryCount: 3,
    publishedAt: '2026-03-10T00:00:00.000Z',
    author: { id: 'author-1', name: 'Alex Morgan', image: null },
    terms: [
      { id: 'cat-1', name: 'Engineering', slug: 'engineering', taxonomy: 'category' },
      { id: 'tag-1', name: 'Architecture', slug: 'architecture', taxonomy: 'tag' },
    ],
    source: 'posts',
    raw: { readingTime: '5 min read', featured: true, authorName: 'Alex Morgan' },
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
    raw: { readingTime: '4 min read', featured: false, authorName: 'Jamie Chen' },
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
    raw: { readingTime: '6 min read', featured: true, authorName: 'Sam Rivera' },
  },
];

export type LoopDateFormat =
  | 'medium'
  | 'long'
  | 'full'
  | 'short'
  | 'month-year'
  | 'iso'
  | 'relative'
  | 'datetime';

export const LOOP_DATE_FORMAT_OPTIONS: {
  label: string;
  value: LoopDateFormat;
}[] = [
  { label: 'Medium (Nov 5, 2026)', value: 'medium' },
  { label: 'Long (November 5, 2026)', value: 'long' },
  { label: 'Full (Thursday, November 5, 2026)', value: 'full' },
  { label: 'Short (11/5/26)', value: 'short' },
  { label: 'Month & Year (November 2026)', value: 'month-year' },
  { label: 'ISO (2026-11-05)', value: 'iso' },
  { label: 'Relative (e.g. 5 days ago)', value: 'relative' },
  { label: 'Date & Time (Nov 5, 2026, 5:14 PM)', value: 'datetime' },
];

export const formatLoopDate = (
  iso: string | null | undefined,
  language = 'en',
  format: LoopDateFormat = 'medium'
): string | null => {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;

  try {
    switch (format) {
      case 'iso':
        return parsed.toISOString().slice(0, 10);
      case 'month-year':
        return parsed.toLocaleDateString(language, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
      case 'long':
        return parsed.toLocaleDateString(language, {
          dateStyle: 'long',
          timeZone: 'UTC',
        });
      case 'full':
        return parsed.toLocaleDateString(language, {
          dateStyle: 'full',
          timeZone: 'UTC',
        });
      case 'short':
        return parsed.toLocaleDateString(language, {
          dateStyle: 'short',
          timeZone: 'UTC',
        });
      case 'datetime':
        return parsed.toLocaleString(language, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        });
      case 'relative': {
        const diffMs = parsed.getTime() - Date.now();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
        if (Math.abs(diffDays) < 1) {
          const diffHours = Math.round(diffMs / (1000 * 60 * 60));
          if (Math.abs(diffHours) < 1) return 'just now';
          return rtf.format(diffHours, 'hour');
        }
        if (Math.abs(diffDays) < 30) {
          return rtf.format(diffDays, 'day');
        }
        if (Math.abs(diffDays) < 365) {
          return rtf.format(Math.round(diffDays / 30), 'month');
        }
        return rtf.format(Math.round(diffDays / 365), 'year');
      }
      case 'medium':
      default:
        return parsed.toLocaleDateString(language, {
          dateStyle: 'medium',
          timeZone: 'UTC',
        });
    }
  } catch {
    return parsed.toISOString().slice(0, 10);
  }
};
