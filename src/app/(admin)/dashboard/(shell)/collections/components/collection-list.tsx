import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PAGES } from '@/config/pages';

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
};

export function CollectionList({
  rows,
}: {
  rows: CollectionRow[];
}) {
  return (
    <TableContainer>
      <TableRoot>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Slug</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>No collections yet.</TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.slug}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={PAGES.DASHBOARD.COLLECTION(row.id)}
                  >
                    <Button size="sm">Edit fields</Button>
                  </Link>{' '}
                  <Link
                    href={PAGES.DASHBOARD.COLLECTION_ENTRIES(row.id)}
                  >
                    <Button size="sm" variant="outline">
                      Entries
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableRoot>
    </TableContainer>
  );
}
