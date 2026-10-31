'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  publishCollectionEntry,
  unpublishCollectionEntry,
  deleteCollectionEntry,
} from '../_modules/collections.actions';
import { EntryStatusBadge } from './entry-list';

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
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <EntryStatusBadge status={status} />
        <form
          action={isPublished ? unpublishCollectionEntry : publishCollectionEntry}
        >
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <Button
            type="submit"
            size="sm"
            variant={isPublished ? 'outline' : 'default'}
          >
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <Card className="mt-4 border-destructive/40">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>Deleting an entry cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={deleteCollectionEntry}>
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="collectionId" value={collectionId} />
          <Button
            type="submit"
            variant="destructive"
            size="sm"
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
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
