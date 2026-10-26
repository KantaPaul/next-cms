'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
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
import { FormInput } from '@/components/ui/input';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createRedirect, importRedirects } from '../_modules/redirects.actions';

export function RedirectsManager({
  rows,
}: {
  rows: { id: string; fromPath: string; toPath: string; statusCode: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [csv, setCsv] = useState('');

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = data.get('statusCode') === '302' ? 302 : 301;
    startTransition(async () => {
      await handleActionResponse(
        createRedirect({
          fromPath: String(data.get('fromPath') ?? ''),
          toPath: String(data.get('toPath') ?? ''),
          statusCode: status,
        }),
        () => {
          toast.success('Redirect saved');
          event.currentTarget.reset();
          router.refresh();
        }
      );
    });
  }

  function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await handleActionResponse(importRedirects({ csv }), result => {
        toast.success(`Imported ${(result as { created: number }).created} redirects`);
        setCsv('');
        router.refresh();
      });
    });
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          From
          <FormInput name="fromPath" required placeholder="/old-path" />
        </label>
        <label className="grid gap-1 text-sm">
          To
          <FormInput name="toPath" required placeholder="/new-path" />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            name="statusCode"
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            defaultValue="301"
          >
            <option value="301">301</option>
            <option value="302">302</option>
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          Add
        </Button>
      </form>

      <TableContainer>
        <TableRoot>
          <TableHead>
            <TableRow>
              <TableHeaderCell>From</TableHeaderCell>
              <TableHeaderCell>To</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>No redirects yet.</TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.fromPath}</TableCell>
                  <TableCell>{row.toPath}</TableCell>
                  <TableCell>{row.statusCode}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableRoot>
      </TableContainer>

      <form onSubmit={onImport} className="grid max-w-xl gap-2">
        <label className="grid gap-1 text-sm">
          CSV import
          <textarea
            value={csv}
            onChange={event => setCsv(event.target.value)}
            required
            rows={6}
            placeholder={'from,to,status\n/old,/new,301'}
            className="rounded-md border border-input bg-transparent p-2 text-sm"
          />
        </label>
        <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">
          Import
        </Button>
      </form>
    </div>
  );
}
