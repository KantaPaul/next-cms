'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type CommentFormLabels = {
  formTitle?: string;
  submitLabel?: string;
  pendingMessage?: string;
};

/** Visitor comment form. Posts to /api/comments; new comments wait for approval. */
export function CommentForm({
  postId,
  targetKind,
  parentId,
  labels,
  editing,
  compact,
  onCancel,
  elements,
}: {
  postId: string;
  targetKind?: 'post' | 'entry';
  parentId?: string;
  labels: CommentFormLabels;
  editing?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  elements?: Record<string, ElementStyle>;
}) {
  const id = useId();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || editing) return;
    if (document.querySelector('script[data-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.dataset.turnstile = 'true';
    document.head.appendChild(script);
  }, [editing]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing) return;
    setState('sending');
    setError(null);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        body: new FormData(event.currentTarget),
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setState('sent');
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(data.error || 'Something went wrong. Please try again.');
      setState('error');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="s-soft-primary s-radius p-4 text-sm font-medium"
      >
        {labels.pendingMessage ||
          'Thanks — your comment is awaiting moderation.'}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      {...el(
        { elements },
        'form',
        cn(
          'relative flex flex-col gap-3',
          !compact && 's-card s-card-outline p-5 md:p-6'
        )
      )}
      aria-label={parentId ? 'Reply to comment' : 'Leave a comment'}
    >
      {!compact && labels.formTitle ? (
        <h3 className="text-lg font-medium [font-family:var(--site-font-heading)]">
          {labels.formTitle}
        </h3>
      ) : null}
      <input type="hidden" name="postId" value={postId} />
      {targetKind === 'entry' ? (
        <input type="hidden" name="targetKind" value="entry" />
      ) : null}
      {parentId ? (
        <input type="hidden" name="parentId" value={parentId} />
      ) : null}
      <label htmlFor={`${id}-body`} className="sr-only">
        Comment
      </label>
      <textarea
        id={`${id}-body`}
        name="body"
        required
        minLength={2}
        maxLength={3000}
        rows={compact ? 3 : 4}
        placeholder={parentId ? 'Write a reply…' : 'Share your thoughts…'}
        {...el({ elements }, 'input', 's-input min-h-24 w-full py-2.5')}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor={`${id}-name`}
            className="s-muted mb-1 block text-xs font-medium"
          >
            Name
          </label>
          <input
            id={`${id}-name`}
            name="authorName"
            required
            maxLength={80}
            autoComplete="name"
            {...el({ elements }, 'input', 's-input h-10 w-full')}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-email`}
            className="s-muted mb-1 block text-xs font-medium"
          >
            Email <span className="font-normal">(not published)</span>
          </label>
          <input
            id={`${id}-email`}
            name="authorEmail"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            {...el({ elements }, 'input', 's-input h-10 w-full')}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-url`}
            className="s-muted mb-1 block text-xs font-medium"
          >
            Website <span className="font-normal">(optional)</span>
          </label>
          <input
            id={`${id}-url`}
            name="authorUrl"
            type="url"
            maxLength={300}
            autoComplete="url"
            {...el({ elements }, 'input', 's-input h-10 w-full')}
          />
        </div>
      </div>
      {/* Honeypot: bots fill it in; real visitors never see it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      />
      {TURNSTILE_SITE_KEY && !editing ? (
        <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state === 'sending'}
          {...el(
            { elements },
            'button',
            's-btn s-btn-primary disabled:opacity-60'
          )}
        >
          {state === 'sending'
            ? 'Posting…'
            : labels.submitLabel || 'Post comment'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            {...el({ elements }, 'button', 's-btn s-btn-outline')}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** "Reply" toggle under a top-level comment. */
export function ReplyToggle({
  postId,
  targetKind,
  parentId,
  labels,
  editing,
  elements,
}: {
  postId: string;
  targetKind?: 'post' | 'entry';
  parentId: string;
  labels: CommentFormLabels;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        {...el(
          { elements },
          'action',
          's-primary-text text-sm font-semibold hover:underline'
        )}
      >
        Reply
      </button>
    );
  }
  return (
    <div className="mt-1 w-full basis-full">
      <CommentForm
        postId={postId}
        targetKind={targetKind}
        parentId={parentId}
        labels={labels}
        editing={editing}
        compact
        onCancel={() => setOpen(false)}
        elements={elements}
      />
    </div>
  );
}

/* ---------- Like / dislike ---------- */

type VisitorState = { reactions: Record<string, number>; own: string[] };
const stateCache = new Map<string, Promise<VisitorState>>();

function visitorState(postId: string, targetKind: 'post' | 'entry' = 'post') {
  const key = `${targetKind}:${postId}`;
  let p = stateCache.get(key);
  if (!p) {
    const qs = new URLSearchParams({ postId });
    if (targetKind === 'entry') qs.set('targetKind', 'entry');
    p = fetch(`/api/comments/state?${qs.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : { reactions: {}, own: [] }))
      .catch(() => ({ reactions: {}, own: [] }));
    stateCache.set(key, p);
  }
  return p;
}

/** Like / dislike buttons. Your own comments show counts only. */
export function CommentReactions({
  postId,
  targetKind,
  commentId,
  likes: initialLikes,
  dislikes: initialDislikes,
  editing,
  elements,
}: {
  postId: string;
  targetKind?: 'post' | 'entry';
  commentId: string;
  likes: number;
  dislikes: number;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [mine, setMine] = useState<0 | 1 | -1>(0);
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) return;
    let live = true;
    visitorState(postId, targetKind).then(s => {
      if (!live) return;
      const v = s.reactions?.[commentId];
      setMine(v === 1 || v === -1 ? v : 0);
      setOwn(Boolean(s.own?.includes(commentId)));
    });
    return () => {
      live = false;
    };
  }, [postId, targetKind, commentId, editing]);

  const react = async (value: 1 | -1) => {
    if (editing || own || busy) return;
    const next = mine === value ? 0 : value;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comments/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ commentId, value: next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        likes?: number;
        dislikes?: number;
        mine?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Couldn’t save your reaction.');
        if (res.status === 403 && /own comment/i.test(data.error ?? ''))
          setOwn(true);
        return;
      }
      setLikes(data.likes ?? likes);
      setDislikes(data.dislikes ?? dislikes);
      setMine(next);
    } catch {
      setError('Couldn’t save your reaction.');
    } finally {
      setBusy(false);
    }
  };

  const btn = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
      active
        ? 's-soft-primary border-[var(--site-primary)] text-[var(--site-primary)]'
        : 'border-[var(--site-border)] s-muted',
      own ? 'cursor-default opacity-70' : 'hover:text-[var(--site-primary)]'
    );
  const ownTitle = 'You can’t like or dislike your own comment';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => react(1)}
        disabled={busy || own}
        aria-pressed={mine === 1}
        aria-label={`Like (${likes})`}
        title={own ? ownTitle : 'Like'}
        {...el({ elements }, 'action', btn(mine === 1))}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
        {likes}
      </button>
      <button
        type="button"
        onClick={() => react(-1)}
        disabled={busy || own}
        aria-pressed={mine === -1}
        aria-label={`Dislike (${dislikes})`}
        title={own ? ownTitle : 'Dislike'}
        {...el({ elements }, 'action', btn(mine === -1))}
      >
        <ThumbsDown className="size-3.5" aria-hidden />
        {dislikes}
      </button>
      {own ? <span className="s-meta">Your comment</span> : null}
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
