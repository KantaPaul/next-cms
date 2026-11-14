import Link from '@/components/atoms/next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PostTypeIcon } from '@/components/atoms/post-type-icon';
import { PAGES } from '@/config/pages';

export type CollectionRow = {
  id: string;
  name: string;
  singularName?: string | null;
  icon?: string | null;
  slug: string;
  templatePageId?: string | null;
  templateName?: string | null;
};

export function CollectionList({
  rows,
  canManage = true,
}: {
  rows: CollectionRow[];
  canManage?: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            {canManage && <TableHead>Template Page</TableHead>}
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 4 : 3}
                className="h-24 text-center text-muted-foreground"
              >
                No post types yet. Start from a preset or create your own.
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <PostTypeIcon
                      name={row.icon}
                      className="size-4 text-muted-foreground"
                    />
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {row.slug}
                </TableCell>
                {canManage && (
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
                )}
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" asChild>
                      <Link href={PAGES.DASHBOARD.COLLECTION(row.slug)}>
                        Entries
                      </Link>
                    </Button>
                    {canManage && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={PAGES.DASHBOARD.COLLECTION_SETTINGS(row.slug)}>
                          Fields & settings
                        </Link>
                      </Button>
                    )}
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
