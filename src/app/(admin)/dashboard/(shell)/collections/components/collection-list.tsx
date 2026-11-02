import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  templatePageId?: string | null;
  templateName?: string | null;
};

export function CollectionList({ rows }: { rows: CollectionRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Template Page</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No collections yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {row.slug}
                </TableCell>
                <TableCell>
                  {row.templateName ? (
                    row.templatePageId ? (
                      <Link
                        href={PAGES.DASHBOARD.PAGES.BUILDER(row.templatePageId)}
                        className="text-primary hover:underline font-medium text-sm"
                        title="Open builder for this template page"
                      >
                        {row.templateName}
                      </Link>
                    ) : (
                      <span className="text-sm">{row.templateName}</span>
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs italic">
                      None
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" asChild>
                      <Link href={PAGES.DASHBOARD.COLLECTION(row.id)}>
                        Edit fields
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={PAGES.DASHBOARD.COLLECTION_ENTRIES(row.id)}>
                        Entries
                      </Link>
                    </Button>
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
