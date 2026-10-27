'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  publishCollectionEntry,
  unpublishCollectionEntry,
  deleteCollectionEntry,
} from '../_modules/collections.actions';

export function EntryStatusCard({
  entryId,
  collectionId,
  status,
}: {
  entryId: string;
  collectionId: string;
  status: string;
}) {
  const isPublished = status === 'published';

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Status
      </h2>
      <p className="text-sm">
        <span className={`font-semibold capitalize ${isPublished ? 'text-emerald-600' : 'text-amber-600'}`}>
          {status}
        </span>
      </p>
      {isPublished ? (
        <form action={unpublishCollectionEntry}>
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <button
            type="submit"
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            Unpublish
          </button>
        </form>
      ) : (
        <form action={publishCollectionEntry}>
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <button
            type="submit"
            className="mt-2 text-emerald-600 hover:text-emerald-800 text-sm"
          >
            Publish
          </button>
        </form>
      )}
    </div>
  );
}

export function DeleteEntryForm({
  entryId,
  collectionId,
  entrySlug,
}: {
  entryId: string;
  collectionId: string;
  entrySlug: string;
}) {
  return (
    <div className="mt-4 rounded-lg border p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Danger zone
      </h2>
      <form action={deleteCollectionEntry}>
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="collectionId" value={collectionId} />
        <button
          type="submit"
          className="text-red-600 hover:text-red-800 text-sm"
          onClick={e => {
            if (
              !window.confirm(
                `Delete entry "${entrySlug}"? This cannot be undone.`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          Delete entry
        </button>
      </form>
    </div>
  );
}
