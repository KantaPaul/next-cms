'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { PAGES } from '@/config/pages';
import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';

export function InboxTable({
  rows,
}: {
  rows: {
    id: string;
    status: string;
    spam: boolean;
    createdAt: string;
    preview: string;
  }[];
}) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No submissions yet.</p>;
  }

  return (
    <TableContainer>
      <TableRoot>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Received</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Preview</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell>{format(new Date(row.createdAt), 'PPp')}</TableCell>
              <TableCell>
                {row.status}
                {row.spam ? ' · spam' : ''}
              </TableCell>
              <TableCell>
                <Link
                  href={PAGES.DASHBOARD.CONTACT_FORM_SUBMISSION(row.id)}
                  className="font-medium hover:underline"
                >
                  {row.preview || 'Open'}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </TableContainer>
  );
}
