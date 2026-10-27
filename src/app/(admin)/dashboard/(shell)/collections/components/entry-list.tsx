import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PAGES } from '@/config/pages';
import {
  publishCollectionEntry,
  unpublishCollectionEntry,
} from '../_modules/collections.actions';

export type EntryRow = {
  id: string;
  slug: string;
  status: string;
  updatedAt: Date | null;
  data: Record<string, unknown> | undefined;
};

export function EntryList({
  entries,
  textFields,
  fields,
  collectionId,
}: {
  entries: EntryRow[];
  textFields: string[];
  fields: { key: string; label: string }[];
  collectionId: string;
}) {
  return (
    <TableContainer>
      <TableRoot>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Slug</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            {textFields.map(f => (
              <TableHeaderCell key={f}>
                {fields.find(x => x.key === f)?.label || f}
              </TableHeaderCell>
            ))}
            <TableHeaderCell>Updated</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>No entries yet.</TableCell>
            </TableRow>
          ) : (
            entries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell>{entry.slug}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.status === 'published'
                        ? 'default'
                        : 'outline'
                    }
                    className={
                      entry.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : ''
                    }
                  >
                    {entry.status}
                  </Badge>
                </TableCell>
                {textFields.map(key => (
                  <TableCell key={key}>
                    {String(entry.data?.[key] ?? '').slice(0, 50)}
                  </TableCell>
                ))}
                <TableCell>
                  {entry.updatedAt
                    ? new Date(entry.updatedAt).toLocaleString()
                    : ''}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={PAGES.DASHBOARD.COLLECTION_ENTRY(
                      collectionId,
                      entry.id
                    )}
                  >
                    <Button size="sm">Edit</Button>
                  </Link>{' '}
                  {entry.status === 'published' ? (
                    <form action={unpublishCollectionEntry}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collectionId}
                      />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                      >
                        Unpublish
                      </Button>
                    </form>
                  ) : (
                    <form action={publishCollectionEntry}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collectionId}
                      />
                      <Button type="submit" size="sm">
                        Publish
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableRoot>
    </TableContainer>
  );
}
