import type React from 'react';
import { cn } from '@/lib/utils/cn';
import type { PostView } from '../post-template';
import type { ElementStyle } from '../style';
import {
  CommentBody,
  CommentForm,
  CommentReactions,
  ReplyToggle,
} from './comments-client';
import { el, linkEl } from './element';
import {
  type CardStyleProps,
  cardClass,
  Section,
  type SectionSettings,
} from './section';

/** Public comment shape loaded for the block (never includes emails). */
export type CommentView = {
  id: string;
  authorName: string;
  authorUrl: string | null;
  isStaff: boolean;
  body: string;
  createdAt: string;
  likes?: number;
  dislikes?: number;
  replies: CommentView[];
};

const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-3xl', wide: 'max-w-5xl' };

export const SAMPLE_COMMENTS: CommentView[] = [
  {
    id: 'sample-1',
    authorName: 'Avery Lin',
    authorUrl: null,
    isStaff: false,
    body: 'This is a sample comment. Approved comments from visitors show here.',
    createdAt: new Date('2026-01-16T10:00:00Z').toISOString(),
    likes: 4,
    dislikes: 1,
    replies: [
      {
        id: 'sample-2',
        authorName: 'Jane Writer',
        authorUrl: null,
        isStaff: true,
        body: 'Replies appear indented. Staff replies get an Author badge.',
        createdAt: new Date('2026-01-16T12:30:00Z').toISOString(),
        replies: [],
      },
    ],
  },
];

export type CommentsProps = CardStyleProps & {
  section?: SectionSettings;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
  post: PostView;
  heading?: string;
  sort?: 'oldest' | 'newest';
  width?: keyof typeof WIDTH;
  showForm?: boolean;
  /** Like / dislike buttons on each comment. */
  showReactions?: boolean;
  formTitle?: string;
  submitLabel?: string;
  pendingMessage?: string;
  closedText?: string;
  emptyText?: string;
  /** Loaded server-side. */
  comments?: CommentView[];
  total?: number;
  /** False when the post or Settings → Single pages has comments off. */
  open?: boolean;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function formatDate(iso: string, language: string) {
  return new Date(iso).toLocaleDateString(language || 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function countComments(list: CommentView[]): number {
  return list.reduce((n, item) => n + 1 + countComments(item.replies), 0);
}

function CommentItem({
  c,
  p,
  depth = 0,
}: {
  c: CommentView;
  p: CommentsProps;
  depth?: number;
}) {
  const isReply = depth > 0;
  const canReply = p.open !== false && p.showForm !== false;
  const name =
    c.authorUrl && /^https?:\/\//i.test(c.authorUrl) ? (
      <a
        href={c.authorUrl}
        rel="nofollow ugc noopener"
        target="_blank"
        {...linkEl(p, 'name', 'hover:underline')}
      >
        {c.authorName}
      </a>
    ) : (
      c.authorName
    );
  return (
    <li className={cn('flex gap-3', isReply && 'mt-4')}>
      <span
        aria-hidden
        {...el(
          p,
          'avatar',
          cn(
            's-soft-primary flex shrink-0 items-center justify-center rounded-full font-semibold',
            isReply ? 'size-8 text-xs' : 'size-10 text-sm'
          )
        )}
      >
        {initials(c.authorName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span {...el(p, 'name', 'font-semibold')}>{name}</span>
          {c.isStaff ? (
            <span {...el(p, 'badge', 's-chip text-[0.7rem]')}>Author</span>
          ) : null}
          <time dateTime={c.createdAt} {...el(p, 'date', 's-meta')}>
            {formatDate(c.createdAt, p.post.language)}
          </time>
        </p>
        <CommentBody
          text={c.body}
          editing={p.editing}
          {...el(p, 'body', 'mt-1.5 flex flex-col gap-2 leading-relaxed')}
        />
        {(p.showReactions !== false || canReply) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            {p.showReactions !== false ? (
              <CommentReactions
                postId={p.post.id}
                targetKind={p.post.targetKind}
                commentId={c.id}
                likes={c.likes ?? 0}
                dislikes={c.dislikes ?? 0}
                editing={p.editing}
                elements={p.elements}
              />
            ) : null}
            {canReply ? (
              <ReplyToggle
                postId={p.post.id}
                targetKind={p.post.targetKind}
                parentId={c.id}
                labels={{
                  submitLabel: 'Post reply',
                  pendingMessage: p.pendingMessage,
                }}
                editing={p.editing}
                elements={p.elements}
              />
            ) : null}
          </div>
        )}
        {c.replies.length > 0 ? (
          <ol
            className={cn(
              'mt-2',
              depth < 4 && 'border-s border-[var(--site-border)] ps-3 sm:ps-4'
            )}
          >
            {c.replies.map(r => (
              <CommentItem key={r.id} c={r} p={p} depth={depth + 1} />
            ))}
          </ol>
        ) : null}
      </div>
    </li>
  );
}

export function Comments(p: CommentsProps) {
  const items = p.comments ?? (p.editing ? SAMPLE_COMMENTS : []);
  const total = p.total ?? countComments(items);
  const open = p.open !== false;

  if (!open && !items.length) {
    if (!p.closedText && !p.editing) return null;
    return (
      <Section
        section={p.section}
        editing={p.editing}
        innerClassName={WIDTH[p.width ?? 'normal']}
      >
        <p className="s-muted text-sm">
          {p.closedText || 'Comments are closed.'}
        </p>
      </Section>
    );
  }

  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={WIDTH[p.width ?? 'normal']}
    >
      <section
        aria-labelledby={`comments-${p.post.id}`}
        id="comments"
        className="flex flex-col gap-8"
      >
        <h2
          id={`comments-${p.post.id}`}
          {...el(p, 'heading', 's-section-title text-2xl s-tab-text-3xl')}
        >
          {p.heading || 'Comments'}
          {total > 0 ? (
            <span className="s-muted ms-2 text-lg font-normal">({total})</span>
          ) : null}
        </h2>

        {items.length > 0 ? (
          <ol
            {...el(
              p,
              'list',
              cn(
                cardClass(p, ''),
                'flex flex-col gap-6',
                p.cardVariant &&
                  p.cardVariant !== 'default' &&
                  p.cardVariant !== 'none' &&
                  'p-5 s-tab-p-6'
              )
            )}
          >
            {items.map(c => (
              <CommentItem key={c.id} c={c} p={p} />
            ))}
          </ol>
        ) : (
          <p className="s-muted">
            {p.emptyText || 'No comments yet. Start the conversation.'}
          </p>
        )}

        {open && p.showForm !== false ? (
          <CommentForm
            postId={p.post.id}
            targetKind={p.post.targetKind}
            labels={{
              formTitle: p.formTitle || 'Leave a comment',
              submitLabel: p.submitLabel,
              pendingMessage: p.pendingMessage,
            }}
            editing={p.editing}
            elements={p.elements}
          />
        ) : !open ? (
          <p className="s-muted text-sm">
            {p.closedText || 'Comments are closed.'}
          </p>
        ) : null}
      </section>
    </Section>
  );
}
