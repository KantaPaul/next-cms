import { ArrowLeft, ArrowRight, Github, Globe, Instagram, Linkedin, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PostCard, PostView } from '../post-template';
import type { ElementStyle } from '../style';
import { el } from './element';
import { type CardStyleProps, cardClass, Section, type SectionSettings } from './section';
import { BookmarkToggle } from './bookmarks-client';
import { type ShareNetwork, ShareButtonsClient } from './share-buttons-client';

type PostBlock = {
  section?: SectionSettings;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
  post: PostView;
};

const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

/* ---------- Author bio ---------- */

export function AuthorBio(
  p: PostBlock & {
    heading?: string;
    showAvatar?: boolean;
    width?: keyof typeof WIDTH;
  }
) {
  const name = p.post.authorName;
  const bio = p.post.authorBio;
  if (!name && !bio) {
    return p.editing ? (
      <Section section={p.section} editing innerClassName={WIDTH.normal}>
        <div className="s-surface s-border s-muted s-radius border border-dashed p-6 text-center text-sm">
          The post author’s name and bio appear here (Account → Public author
          profile).
        </div>
      </Section>
    ) : null;
  }
  const initials = (name ?? '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <aside
        aria-label="About the author"
        {...el(p, 'card', 's-card s-card-outline flex flex-col gap-5 p-6 sm:flex-row sm:items-start md:p-8')}
      >
        {p.showAvatar !== false &&
          (p.post.authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.post.authorImage}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="s-soft-primary flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            >
              {initials}
            </span>
          ))}
        <div className="min-w-0">
          {p.heading ? (
            <p className="s-eyebrow-plain mb-2">{p.heading}</p>
          ) : null}
          {name ? (
            <p {...el(p, 'name', 'text-xl font-medium [font-family:var(--site-font-heading)]')}>
              {p.post.authorUrl ? (
                <a href={p.post.authorUrl} className="hover:underline">
                  {name}
                </a>
              ) : (
                name
              )}
            </p>
          ) : null}
          {bio ? (
            <p {...el(p, 'bio', 's-muted mt-2 leading-relaxed')}>{bio}</p>
          ) : null}
        </div>
      </aside>
    </Section>
  );
}

/* ---------- Author card ---------- */

const SOCIAL_ICONS = {
  x: { Icon: Twitter, label: 'X' },
  linkedin: { Icon: Linkedin, label: 'LinkedIn' },
  github: { Icon: Github, label: 'GitHub' },
  instagram: { Icon: Instagram, label: 'Instagram' },
} as const;

const safeHttps = (v: unknown): string | null =>
  typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(v) ? v : null;

const initialsOf = (name: string | null | undefined) =>
  (name ?? '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function AuthorCard(
  p: PostBlock &
    CardStyleProps & {
      heading?: string;
      layout?: 'horizontal' | 'stacked';
      width?: keyof typeof WIDTH;
      showSocial?: boolean;
      showPostCount?: boolean;
      showLatestPosts?: boolean;
      latestTitle?: string;
      viewAllLabel?: string;
      latestPosts?: PostCard[];
    }
) {
  const post = p.post;
  const name = post.authorName;
  if (!name && !post.authorBio) {
    return p.editing ? (
      <Section section={p.section} editing innerClassName={WIDTH.normal}>
        <div className="s-surface s-border s-muted s-radius border border-dashed p-6 text-center text-sm">
          The post author’s profile card appears here (Account → Public author
          profile).
        </div>
      </Section>
    ) : null;
  }
  const stacked = p.layout === 'stacked';
  const website = safeHttps(post.authorWebsite);
  const socials = p.showSocial === false
    ? []
    : (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[])
        .map(key => ({ key, href: safeHttps(post.authorSocial?.[key]) }))
        .filter((s): s is { key: keyof typeof SOCIAL_ICONS; href: string } => Boolean(s.href));
  const latest = p.showLatestPosts === false ? [] : (p.latestPosts ?? []);
  const count = post.authorPostCount ?? 0;

  return (
    <Section section={p.section} editing={p.editing} innerClassName={WIDTH[p.width ?? 'normal']}>
      <aside
        aria-label="About the author"
        {...el(
          p,
          'card',
          cn(
            cardClass(p, 's-card s-card-outline'),
            'flex flex-col gap-6 p-6 md:p-8',
            stacked ? 'items-center text-center' : 'sm:flex-row sm:items-start'
          )
        )}
      >
        {post.authorImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.authorImage} alt="" className="size-20 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="s-soft-primary flex size-20 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
          >
            {initialsOf(name)}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {p.heading ? <p className="s-eyebrow-plain">{p.heading}</p> : null}
          <div>
            {name ? (
              <p {...el(p, 'name', 'text-2xl font-medium [font-family:var(--site-font-heading)]')}>
                {post.authorUrl ? (
                  <a href={post.authorUrl} rel="author" className="hover:underline">
                    {name}
                  </a>
                ) : (
                  name
                )}
              </p>
            ) : null}
            {(post.authorJobTitle || (p.showPostCount !== false && count > 0)) && (
              <p className={cn('s-meta mt-1 flex flex-wrap gap-x-3', stacked && 'justify-center')}>
                {post.authorJobTitle ? <span>{post.authorJobTitle}</span> : null}
                {p.showPostCount !== false && count > 0 ? (
                  <span>
                    {count} {count === 1 ? 'post' : 'posts'}
                  </span>
                ) : null}
              </p>
            )}
          </div>
          {post.authorBio ? (
            <p {...el(p, 'bio', 's-muted leading-relaxed')}>{post.authorBio}</p>
          ) : null}
          {(website || socials.length > 0) && (
            <ul className={cn('flex flex-wrap items-center gap-2', stacked && 'justify-center')}>
              {website && (
                <li>
                  <a
                    href={website}
                    rel="me noopener"
                    target="_blank"
                    className="s-chip inline-flex items-center gap-1.5 text-sm hover:text-[var(--site-primary)]"
                  >
                    <Globe className="size-3.5" aria-hidden />
                    {website.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '')}
                  </a>
                </li>
              )}
              {socials.map(({ key, href }) => {
                const { Icon, label } = SOCIAL_ICONS[key];
                return (
                  <li key={key}>
                    <a
                      href={href}
                      rel="me noopener"
                      target="_blank"
                      aria-label={`${name ?? 'Author'} on ${label}`}
                      className="s-icon-btn inline-flex size-9 items-center justify-center"
                    >
                      <Icon className="size-4" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {latest.length > 0 && (
            <div className={cn('mt-2 border-t border-[var(--site-border)] pt-4', stacked && 'text-left')}>
              <p className="s-eyebrow-plain mb-3">{p.latestTitle || `More from ${name ?? 'this author'}`}</p>
              <ul className="flex flex-col gap-2.5">
                {latest.map(item => (
                  <li key={item.id} className="flex items-baseline justify-between gap-4">
                    <a
                      href={item.url}
                      className="min-w-0 truncate font-medium [font-family:var(--site-font-heading)] hover:text-[var(--site-primary)]"
                    >
                      {item.title}
                    </a>
                    {item.publishedAt ? (
                      <span className="s-muted shrink-0 text-xs">
                        {new Date(item.publishedAt).toLocaleDateString(item.language || 'en', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {post.authorUrl && p.viewAllLabel !== '' ? (
            <a
              href={post.authorUrl}
              className={cn(
                's-btn s-btn-outline mt-1 inline-flex w-fit items-center gap-1.5 px-4 py-2 text-sm',
                stacked && 'self-center'
              )}
            >
              {p.viewAllLabel || 'View all posts'}
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </aside>
    </Section>
  );
}

/* ---------- Previous / next ---------- */

function NavCard({
  card,
  dir,
  label,
  minimal,
  showImage,
  showDate,
}: {
  card: PostCard;
  dir: 'prev' | 'next';
  label: string;
  minimal?: boolean;
  showImage?: boolean;
  showDate?: boolean;
}) {
  const date =
    showDate && card.publishedAt
      ? new Date(card.publishedAt).toLocaleDateString(card.language || 'en', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;
  return (
    <a
      href={card.url}
      rel={dir}
      className={cn(
        'group flex min-w-0 gap-4',
        minimal ? 'py-2' : 's-card s-card-outline s-hover-lift p-5',
        dir === 'next' && 'sm:flex-row-reverse sm:text-right'
      )}
    >
      {showImage && !minimal && card.featuredImage && (
        // biome-ignore lint/performance/noImgElement: arbitrary media URLs
        <img
          src={card.featuredImage}
          alt=""
          loading="lazy"
          className="s-radius size-16 shrink-0 object-cover"
        />
      )}
      <span className={cn('flex min-w-0 flex-col gap-1.5', dir === 'next' && 'sm:items-end')}>
        <span className="s-meta inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em]">
          {dir === 'prev' && <ArrowLeft className="size-3.5" aria-hidden />}
          {label}
          {dir === 'next' && <ArrowRight className="size-3.5" aria-hidden />}
        </span>
        <span
          className={cn(
            'font-medium leading-snug [font-family:var(--site-font-heading)] group-hover:text-[var(--site-primary)]',
            minimal ? 'text-base' : 'text-lg'
          )}
        >
          {card.title}
        </span>
        {date && <span className="s-muted text-xs">{date}</span>}
      </span>
    </a>
  );
}

export function PostNavigation(
  p: PostBlock & {
    previousLabel?: string;
    nextLabel?: string;
    width?: keyof typeof WIDTH;
    layout?: 'split' | 'minimal';
    showImage?: boolean;
    showDate?: boolean;
    previous?: PostCard | null;
    next?: PostCard | null;
  }
) {
  const previous = p.previous ?? null;
  const next = p.next ?? null;
  if (!previous && !next) {
    return p.editing ? (
      <Section section={p.section} editing innerClassName={WIDTH.normal}>
        <div className="s-surface s-border s-muted s-radius border border-dashed p-6 text-center text-sm">
          Links to the previous and next published items appear here.
        </div>
      </Section>
    ) : null;
  }
  const minimal = p.layout === 'minimal';
  const shared = { minimal, showImage: p.showImage, showDate: p.showDate };
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <nav
        aria-label="Previous and next"
        className={cn(
          'grid sm:grid-cols-2',
          minimal ? 'gap-2 border-y border-[var(--site-border)] py-3' : 'gap-4'
        )}
      >
        {previous ? (
          <NavCard card={previous} dir="prev" label={p.previousLabel || 'Previous'} {...shared} />
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <NavCard card={next} dir="next" label={p.nextLabel || 'Next'} {...shared} />
        ) : null}
      </nav>
    </Section>
  );
}

/* ---------- Share ---------- */

export const SHARE_NETWORKS: ShareNetwork[] = [
  'copy',
  'x',
  'linkedin',
  'facebook',
  'email',
];

export function ShareButtons(
  p: PostBlock & {
    label?: string;
    /** A preset name (inspector select) or an explicit list. */
    networks?: 'default' | 'all' | 'copy' | 'none' | ShareNetwork[];
    align?: 'left' | 'center';
    width?: keyof typeof WIDTH;
    /** Save-for-later button in the same row. */
    showBookmark?: boolean;
    bookmarkLabel?: string;
  }
) {
  const list: string[] = Array.isArray(p.networks)
    ? p.networks
    : p.networks === 'all'
      ? SHARE_NETWORKS
      : p.networks === 'copy'
        ? ['copy']
        : p.networks === 'none'
          ? []
          : ['copy', 'x', 'linkedin', 'email'];
  const networks = list.filter((n): n is ShareNetwork =>
    SHARE_NETWORKS.includes(n as ShareNetwork)
  );
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-6 gap-y-3',
          p.align === 'center' ? 'justify-center' : 'justify-between'
        )}
      >
        {networks.length > 0 && (
          <ShareButtonsClient
            networks={networks}
            title={p.post.title}
            label={p.label}
            align={p.align}
          />
        )}
        {p.showBookmark && (
          <BookmarkToggle
            title={p.post.title}
            image={p.post.featuredImage}
            label={p.bookmarkLabel ?? 'Save'}
          />
        )}
      </div>
    </Section>
  );
}

/* ---------- Bookmark (save this post) ---------- */

export function BookmarkButton(
  p: PostBlock & {
    label?: string;
    align?: 'left' | 'center';
    width?: keyof typeof WIDTH;
  }
) {
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <div className={cn('flex', p.align === 'center' && 'justify-center')}>
        <BookmarkToggle
          title={p.post.title}
          image={p.post.featuredImage}
          label={p.label}
        />
      </div>
    </Section>
  );
}
