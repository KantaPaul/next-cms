import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PostCard, PostView } from '../post-template';
import type { ElementStyle } from '../style';
import { el } from './element';
import { Section, type SectionSettings } from './section';
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

/* ---------- Previous / next ---------- */

function NavCard({
  card,
  dir,
  label,
}: {
  card: PostCard;
  dir: 'prev' | 'next';
  label: string;
}) {
  return (
    <a
      href={card.url}
      className={cn(
        's-card s-card-outline s-hover-lift group flex flex-col gap-1.5 p-5',
        dir === 'next' && 'sm:items-end sm:text-right'
      )}
    >
      <span className="s-meta inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em]">
        {dir === 'prev' && <ArrowLeft className="size-3.5" aria-hidden />}
        {label}
        {dir === 'next' && <ArrowRight className="size-3.5" aria-hidden />}
      </span>
      <span className="text-lg font-medium leading-snug [font-family:var(--site-font-heading)] group-hover:text-[var(--site-primary)]">
        {card.title}
      </span>
    </a>
  );
}

export function PostNavigation(
  p: PostBlock & {
    previousLabel?: string;
    nextLabel?: string;
    width?: keyof typeof WIDTH;
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
          Links to the previous and next published posts appear here.
        </div>
      </Section>
    ) : null;
  }
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <nav aria-label="More posts" className="grid gap-4 sm:grid-cols-2">
        {previous ? (
          <NavCard card={previous} dir="prev" label={p.previousLabel || 'Previous'} />
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <NavCard card={next} dir="next" label={p.nextLabel || 'Next'} />
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
    networks?: 'default' | 'all' | 'copy' | ShareNetwork[];
    align?: 'left' | 'center';
    width?: keyof typeof WIDTH;
  }
) {
  const list: string[] = Array.isArray(p.networks)
    ? p.networks
    : p.networks === 'all'
      ? SHARE_NETWORKS
      : p.networks === 'copy'
        ? ['copy']
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
      <ShareButtonsClient
        networks={networks}
        title={p.post.title}
        label={p.label}
        align={p.align}
      />
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
