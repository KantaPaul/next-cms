'use client';

// Reads the current loop item from React context, so it must render on the client.
import { useLoopItem } from './query-loop-client';
import { formatLoopDate, SAMPLE_LOOP_ITEMS } from './loop-shared';

// ---------------------------------------------------------------------------
// LoopItemField Block (R575 / QRY-05)
// ---------------------------------------------------------------------------

export interface LoopItemFieldProps {
  field?:
    | 'title'
    | 'excerpt'
    | 'image'
    | 'publishedAt'
    | 'author'
    | 'terms'
    | 'readMore'
    | 'custom';
  customKey?: string;
  linkToItem?: boolean;
  readMoreLabel?: string;
  language?: string;
  editing?: boolean;
}

export function LoopItemField({
  field = 'title',
  customKey = '',
  linkToItem = true,
  readMoreLabel = 'Read more',
  language = 'en',
}: LoopItemFieldProps) {
  const item = useLoopItem() ?? SAMPLE_LOOP_ITEMS[0];

  switch (field) {
    case 'image':
      if (!item.image) return null;
      return linkToItem ? (
        <a href={item.url} className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="aspect-video size-full object-cover"
          />
        </a>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="aspect-video size-full object-cover"
        />
      );

    case 'title':
      return (
        <h3 className="text-lg font-bold leading-snug">
          {linkToItem ? (
            <a href={item.url} className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
      );

    case 'excerpt':
      if (!item.excerpt) return null;
      return (
        <p className="s-muted line-clamp-3 text-sm leading-relaxed">
          {item.excerpt}
        </p>
      );

    case 'publishedAt': {
      const formatted = formatLoopDate(item.publishedAt, language);
      if (!formatted) return null;
      return (
        <time
          dateTime={item.publishedAt ?? undefined}
          className="s-muted text-xs"
        >
          {formatted}
        </time>
      );
    }

    case 'author':
      if (!item.author?.name) return null;
      return <span className="s-muted text-xs">{item.author.name}</span>;

    case 'terms': {
      const terms = item.terms ?? [];
      if (terms.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1.5">
          {terms.map(t => (
            <span
              key={`${t.taxonomy}-${t.id}`}
              className="s-primary-text text-xs font-semibold uppercase tracking-wider"
            >
              {t.name}
            </span>
          ))}
        </div>
      );
    }

    case 'readMore':
      return (
        <a
          href={item.url}
          className="s-primary-text inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          {readMoreLabel} →
        </a>
      );

    case 'custom': {
      const rawVal = customKey ? item.raw?.[customKey] : undefined;
      if (rawVal === undefined || rawVal === null) return null;
      return <span className="text-sm">{String(rawVal)}</span>;
    }

    default:
      return null;
  }
}
