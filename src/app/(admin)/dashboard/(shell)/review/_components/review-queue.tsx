'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { approveReview, requestReviewChanges } from '../_modules/review.actions';

type Row = {
  kind: 'page' | 'post';
  id: string;
  title: string;
  authorName: string | null;
  authorEmail: string | null;
};

export function ReviewQueue({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nothing is waiting for review.</p>;
  }

  return (
    <ul className="grid gap-4">
      {rows.map(row => (
        <li key={`${row.kind}-${row.id}`} className="rounded-lg border p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-sm text-muted-foreground">
                {row.kind} · {row.authorName || row.authorEmail || 'Unknown author'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await handleActionResponse(
                    approveReview({ kind: row.kind, id: row.id }),
                    () => {
                      toast.success('Approved and published');
                      router.refresh();
                    }
                  );
                })
              }
            >
              Approve
            </Button>
          </div>
          <form
            className="grid gap-2"
            onSubmit={event => {
              event.preventDefault();
              startTransition(async () => {
                await handleActionResponse(
                  requestReviewChanges({
                    kind: row.kind,
                    id: row.id,
                    note: notes[row.id] ?? '',
                  }),
                  () => {
                    toast.success('Changes requested');
                    router.refresh();
                  }
                );
              });
            }}
          >
            <textarea
              required
              rows={3}
              value={notes[row.id] ?? ''}
              onChange={event =>
                setNotes(current => ({ ...current, [row.id]: event.target.value }))
              }
              placeholder="What should the author change?"
              className="rounded-md border border-input bg-transparent p-2 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" disabled={pending} className="justify-self-start">
              Request changes
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
