'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { CommentStatus } from '@/db/schemas/operations.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  deleteCommentsForever,
  replyToComment,
  setCommentStatus,
} from '../_modules/comments.actions';

export type CommentRow = {
  id: string;
  isReply: boolean;
  authorName: string;
  authorEmail: string;
  authorUrl: string | null;
  isStaff: boolean;
  body: string;
  createdAt: string;
  postTitle: string;
  postUrl: string;
};

type Action = { label: string; status?: CommentStatus; forever?: boolean };

const ACTIONS: Record<CommentStatus, Action[]> = {
  pending: [
    { label: 'Approve', status: 'approved' },
    { label: 'Spam', status: 'spam' },
    { label: 'Trash', status: 'trash' },
  ],
  approved: [
    { label: 'Unapprove', status: 'pending' },
    { label: 'Spam', status: 'spam' },
    { label: 'Trash', status: 'trash' },
  ],
  spam: [
    { label: 'Not spam', status: 'pending' },
    { label: 'Trash', status: 'trash' },
  ],
  trash: [
    { label: 'Restore', status: 'pending' },
    { label: 'Delete permanently', forever: true },
  ],
};

export function CommentsTable({
  rows,
  status,
}: {
  rows: CommentRow[];
  status: CommentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const run = (ids: string[], action: Action) =>
    startTransition(async () => {
      if (
        action.forever &&
        !window.confirm(
          `Permanently delete ${ids.length} comment${ids.length === 1 ? '' : 's'}? This can’t be undone.`
        )
      ) {
        return;
      }
      const onDone = () => {
        toast.success(
          action.forever ? 'Deleted' : `${ids.length === 1 ? 'Comment' : 'Comments'} updated`
        );
        setSelected(new Set());
        router.refresh();
      };
      if (action.forever) {
        await handleActionResponse(deleteCommentsForever({ ids }), onDone);
      } else {
        await handleActionResponse(
          setCommentStatus({ ids, status: action.status as CommentStatus }),
          onDone
        );
      }
    });

  const sendReply = (parentId: string) =>
    startTransition(async () => {
      await handleActionResponse(replyToComment({ parentId, body: replyText }), () => {
        toast.success('Reply published');
        setReplyTo(null);
        setReplyText('');
        router.refresh();
      });
    });

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === 'pending' ? 'No comments waiting for approval.' : 'Nothing here.'}
      </p>
    );
  }

  const allSelected = selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))}
            aria-label="Select all comments"
          />
          Select all
        </label>
        {selected.size > 0 &&
          ACTIONS[status].map(action => (
            <Button
              key={action.label}
              size="sm"
              variant={action.forever ? 'destructive' : 'outline'}
              disabled={pending}
              onClick={() => run([...selected], action)}
            >
              {action.label} ({selected.size})
            </Button>
          ))}
      </div>
      <ul className="divide-y rounded-lg border">
        {rows.map(row => (
          <li key={row.id} className="flex gap-3 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(row.id)}
              onChange={() => toggle(row.id)}
              aria-label={`Select comment by ${row.authorName}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold">{row.authorName}</span>
                {row.isStaff && (
                  <span className="rounded bg-muted px-1.5 text-xs">Staff</span>
                )}
                <span className="text-muted-foreground">{row.authorEmail}</span>
                {row.authorUrl && (
                  <a
                    href={row.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-muted-foreground underline"
                  >
                    website
                  </a>
                )}
                <span className="text-muted-foreground">
                  · {format(new Date(row.createdAt), 'PPp')}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.isReply ? 'Reply on ' : 'On '}
                <a href={row.postUrl} target="_blank" rel="noreferrer" className="underline">
                  {row.postTitle}
                </a>
              </p>
              <p className="mt-2 whitespace-pre-line text-sm">{row.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACTIONS[status].map(action => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.forever ? 'destructive' : 'outline'}
                    disabled={pending}
                    onClick={() => run([row.id], action)}
                  >
                    {action.label}
                  </Button>
                ))}
                {(status === 'pending' || status === 'approved') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      setReplyTo(replyTo === row.id ? null : row.id);
                      setReplyText('');
                    }}
                  >
                    Reply
                  </Button>
                )}
              </div>
              {replyTo === row.id && (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    maxLength={3000}
                    placeholder="Your reply is published right away and approves this comment."
                    aria-label="Reply"
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending || replyText.trim().length < 2}
                      onClick={() => sendReply(row.id)}
                    >
                      Publish reply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
