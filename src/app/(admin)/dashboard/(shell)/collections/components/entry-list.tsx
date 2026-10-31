import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export function EntryStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === 'published' ? 'default' : 'outline'}
      className={
        status === 'published'
          ? 'bg-emerald-100 capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'capitalize'
      }
    >
      {status}
    </Badge>
  );
}

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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            {textFields.map(f => (
              <TableHead key={f}>
                {fields.find(x => x.key === f)?.label || f}
              </TableHead>
            ))}
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={textFields.length + 3}
                className="h-24 text-center text-muted-foreground"
              >
                No entries yet.
              </TableCell>
            </TableRow>
          ) : (
            entries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.slug}</TableCell>
                <TableCell>
                  <EntryStatusBadge status={entry.status} />
                </TableCell>
                {textFields.map(key => (
                  <TableCell key={key}>
                    {String(entry.data?.[key] ?? '').slice(0, 50)}
                  </TableCell>
                ))}
                <TableCell className="text-muted-foreground">
                  {entry.updatedAt
                    ? new Date(entry.updatedAt).toLocaleString()
                    : ''}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={PAGES.DASHBOARD.COLLECTION_ENTRY(
                          collectionId,
                          entry.id
                        )}
                      >
                        Edit
                      </Link>
                    </Button>
                    <form
                      action={
                        entry.status === 'published'
                          ? unpublishCollectionEntry
                          : publishCollectionEntry
                      }
                    >
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collectionId}
                      />
                      {entry.status === 'published' ? (
                        <Button type="submit" variant="destructive" size="sm">
                          Unpublish
                        </Button>
                      ) : (
                        <Button type="submit" size="sm">
                          Publish
                        </Button>
                      )}
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
