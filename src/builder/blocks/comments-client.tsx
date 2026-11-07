'use client';

import { type FormEvent, useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils/cn';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type CommentFormLabels = {
  formTitle?: string;
  submitLabel?: string;
  pendingMessage?: string;
};

/** Visitor comment form. Posts to /api/comments; new comments wait for approval. */
export function CommentForm({
  postId,
  parentId,
  labels,
  editing,
  compact,
  onCancel,
}: {
  postId: string;
  parentId?: string;
  labels: CommentFormLabels;
  editing?: boolean;
  compact?: boolean;
  onCancel?: () => void;
}) {
  const id = useId();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
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
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'Something went wrong. Please try again.');
      setState('error');
    } catch {
      setError('Something went wrong. Please try again.');
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div role="status" className="s-soft-primary s-radius p-4 text-sm font-medium">
        {labels.pendingMessage || 'Thanks — your comment is awaiting moderation.'}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('relative flex flex-col gap-3', !compact && 's-card s-card-outline p-5 md:p-6')}
      aria-label={parentId ? 'Reply to comment' : 'Leave a comment'}
    >
      {!compact && labels.formTitle ? (
        <h3 className="text-lg font-medium [font-family:var(--site-font-heading)]">
          {labels.formTitle}
        </h3>
      ) : null}
      <input type="hidden" name="postId" value={postId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
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
        className="s-input min-h-24 w-full py-2.5"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-name`} className="s-muted mb-1 block text-xs font-medium">
            Name
          </label>
          <input
            id={`${id}-name`}
            name="authorName"
            required
            maxLength={80}
            autoComplete="name"
            className="s-input h-10 w-full"
          />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="s-muted mb-1 block text-xs font-medium">
            Email <span className="font-normal">(not published)</span>
          </label>
          <input
            id={`${id}-email`}
            name="authorEmail"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className="s-input h-10 w-full"
          />
        </div>
        <div>
          <label htmlFor={`${id}-url`} className="s-muted mb-1 block text-xs font-medium">
            Website <span className="font-normal">(optional)</span>
          </label>
          <input
            id={`${id}-url`}
            name="authorUrl"
            type="url"
            maxLength={300}
            autoComplete="url"
            className="s-input h-10 w-full"
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
          className="s-btn s-btn-primary disabled:opacity-60"
        >
          {state === 'sending' ? 'Posting…' : labels.submitLabel || 'Post comment'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="s-btn s-btn-outline">
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
  parentId,
  labels,
  editing,
}: {
  postId: string;
  parentId: string;
  labels: CommentFormLabels;
  editing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="s-primary-text text-sm font-semibold hover:underline"
      >
        Reply
      </button>
    );
  }
  return (
    <div className="mt-3">
      <CommentForm
        postId={postId}
        parentId={parentId}
        labels={labels}
        editing={editing}
        compact
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
