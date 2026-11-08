import type { NormalizedListingItem } from '@nextcms/builder-core';
import { Quote, Star } from 'lucide-react';
import type { ElementStyle } from '../style';
import { el } from './element';
import { Faq, Team, Testimonials } from './marketing';
import { QueryLoopCarousel } from './query-loop-client';
import {
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

export type PostTypeEntriesDisplay =
  'cards' | 'team' | 'testimonials' | 'testimonial-slider' | 'faq';

export interface PostTypeEntriesProps {
  /** Element styles (`elementStyle()` fields), e.g. the section heading. */
  elements?: Record<string, ElementStyle>;
  collectionId?: string;
  postTypeSlug?: string;
  /** Set by the loader when the post type resolved (by id or slug). */
  resolvedCollectionId?: string;
  display?: PostTypeEntriesDisplay;
  eyebrow?: string;
  title?: string;
  limit?: number;
  sortOrder?: 'oldest' | 'newest';
  linkToEntry?: boolean;
  emptyText?: string;
  /** Loaded by the PostTypeEntries loader. */
  items?: NormalizedListingItem[];
  section?: SectionSettings;
  editing?: boolean;
}

type Raw = Record<string, unknown>;

/** Plain text from stored rich text, for blocks that render strings. */
function plain(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function str(raw: Raw, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

const SAMPLE_ITEMS: NormalizedListingItem[] = [
  [
    'Alex Morgan',
    'Head of Design',
    'Working with this team changed how we ship.',
  ],
  [
    'Sam Rivera',
    'Engineering Lead',
    'Fast, thoughtful, and a joy to collaborate with.',
  ],
  ['Jordan Lee', 'Product Manager', 'The best partner we have had in years.'],
].map(([name, role, quote], i) => ({
  id: `sample-${i}`,
  title: name,
  slug: `sample-${i}`,
  url: '#',
  excerpt: quote,
  image: null,
  publishedAt: null,
  terms: [],
  source: 'collection-entries',
  raw: { name, author: name, role, quote, question: `${role}?`, answer: quote },
}));

export function PostTypeEntries({
  collectionId,
  postTypeSlug,
  resolvedCollectionId,
  display = 'cards',
  eyebrow,
  title,
  linkToEntry = false,
  emptyText = 'Nothing to show yet.',
  items: loaded,
  section,
  elements,
  editing,
}: PostTypeEntriesProps) {
  // Loaded data knows whether the type exists; unloaded editor previews
  // trust the props until the next load.
  const hasType =
    loaded !== undefined
      ? Boolean(resolvedCollectionId)
      : Boolean(collectionId || postTypeSlug);
  if (!hasType) {
    return editing ? (
      <Section section={section} editing={editing}>
        <div className="s-surface s-border s-muted s-radius flex aspect-[16/6] items-center justify-center border border-dashed p-6 text-center text-sm">
          {postTypeSlug && !collectionId
            ? `No “${postTypeSlug}” post type yet. Add it under Dashboard → Post types, or pick another post type in the sidebar.`
            : 'Pick a post type in the sidebar to show its entries here.'}
        </div>
      </Section>
    ) : null;
  }

  const items = loaded ?? (editing ? SAMPLE_ITEMS : []);

  if (!items.length) {
    return editing ? (
      <Section section={section} editing={editing}>
        <SectionHeading elements={elements} eyebrow={eyebrow} title={title} />
        <p className="s-muted text-center text-sm">
          {emptyText} Publish entries of this post type to show them.
        </p>
      </Section>
    ) : null;
  }

  const raw = (item: NormalizedListingItem) => (item.raw ?? {}) as Raw;
  const styled = { elements };

  if (display === 'team') {
    return (
      <Team
        eyebrow={eyebrow}
        title={title}
        section={section}
        elements={elements}
        editing={editing}
        items={items.map(item => ({
          name: str(raw(item), 'name') || item.title,
          role: str(raw(item), 'role', 'position', 'job_title'),
          photo: str(raw(item), 'photo', 'avatar') || item.image || undefined,
        }))}
      />
    );
  }

  const testimonialItems = items.map(item => {
    const r = raw(item);
    return {
      quote: plain(r.quote) || plain(item.excerpt) || item.title,
      author: str(r, 'author', 'name') || item.title,
      role: str(r, 'role', 'position'),
      company: str(r, 'company'),
      avatar: str(r, 'avatar', 'photo') || item.image || undefined,
      rating: Number(r.rating) || 0,
    };
  });

  if (display === 'testimonials') {
    return (
      <Testimonials
        eyebrow={eyebrow}
        title={title}
        section={section}
        elements={elements}
        editing={editing}
        items={testimonialItems}
      />
    );
  }

  if (display === 'testimonial-slider') {
    return (
      <Section section={section} editing={editing} hasItems>
        <SectionHeading elements={elements} eyebrow={eyebrow} title={title} />
        <QueryLoopCarousel
          gapClass="gap-6"
          columnsDesktop={2}
          elements={elements}
        >
          {testimonialItems.map((t, i) => (
            <figure
              key={i}
              {...el(
                styled,
                'card',
                's-surface s-border s-radius flex h-full flex-col border p-7'
              )}
            >
              <Quote
                {...el(styled, 'quoteIcon', 's-primary-text mb-4 size-6')}
                aria-hidden
              />
              {t.rating > 0 && (
                <div
                  className="mb-3 flex gap-0.5"
                  aria-label={`${Math.min(t.rating, 5)} out of 5`}
                >
                  {Array.from({
                    length: Math.min(Math.round(t.rating), 5),
                  }).map((_, s) => (
                    <Star
                      key={s}
                      {...el(
                        styled,
                        'stars',
                        'size-4 fill-current text-amber-500'
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
              )}
              <blockquote
                {...el(styled, 'quote', 'flex-1 text-lg leading-relaxed')}
              >
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {t.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatar}
                    alt=""
                    {...el(
                      styled,
                      'avatar',
                      'size-11 rounded-full object-cover'
                    )}
                  />
                )}
                <div>
                  <p {...el(styled, 'author', 'font-semibold')}>{t.author}</p>
                  {(t.role || t.company) && (
                    <p {...el(styled, 'role', 's-muted text-sm')}>
                      {[t.role, t.company].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </QueryLoopCarousel>
      </Section>
    );
  }

  if (display === 'faq') {
    return (
      <Faq
        eyebrow={eyebrow}
        title={title}
        section={section}
        elements={elements}
        editing={editing}
        items={items.map(item => ({
          question: str(raw(item), 'question') || item.title,
          answer: plain(raw(item).answer) || plain(item.excerpt),
        }))}
      />
    );
  }

  // Generic cards for any custom post type.
  return (
    <Section section={section} editing={editing} hasItems>
      <SectionHeading elements={elements} eyebrow={eyebrow} title={title} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => {
          const body = (
            <>
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt=""
                  {...el(
                    styled,
                    'image',
                    's-radius mb-4 aspect-[4/3] w-full object-cover'
                  )}
                />
              )}
              <p {...el(styled, 'title', 'font-semibold')}>{item.title}</p>
              {item.excerpt && (
                <p {...el(styled, 'excerpt', 's-muted mt-2 text-sm')}>
                  {plain(item.excerpt)}
                </p>
              )}
            </>
          );
          return (
            <MotionItem
              key={item.id}
              as="div"
              {...el(styled, 'card', 's-surface s-border s-radius border p-5')}
            >
              {linkToEntry && !editing ? (
                <a href={item.url} className="block hover:opacity-90">
                  {body}
                </a>
              ) : (
                body
              )}
            </MotionItem>
          );
        })}
      </div>
    </Section>
  );
}
