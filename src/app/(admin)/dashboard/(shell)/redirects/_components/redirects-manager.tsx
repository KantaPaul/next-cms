'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
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
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller } from 'react-hook-form';
import { Select } from '@/components/ui/select';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormItem, FormMessage } from '@/components/ui/form';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createRedirect, importRedirects } from '../_modules/redirects.actions';
import { createRedirectSchema } from '../_modules/redirects.schemas';
import { useFormAction } from '@/hooks/use-form-action';

export type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
};

export function RedirectsManager({
  rows,
}: {
  rows: RedirectRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [csv, setCsv] = useState('');

  const form = useForm<z.infer<typeof createRedirectSchema>>({
    resolver: zodResolver(createRedirectSchema),
    defaultValues: { fromPath: '', toPath: '', statusCode: '301' },
  });

  const { submit, isPending: createPending } = useFormAction(
    async (data: z.infer<typeof createRedirectSchema>) => {
      const result = await createRedirect(data);
      return result as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        form.reset({ fromPath: '', toPath: '', statusCode: '301' });
        toast.success('Redirect saved');
        router.refresh();
      },
    }
  );

  const onCreate = (data: z.infer<typeof createRedirectSchema>) => {
    submit({
      fromPath: data.fromPath,
      toPath: data.toPath,
      statusCode: data.statusCode as '301' | '302',
    });
  };

  function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const formData = new FormData(event.currentTarget);
      const csv = formData.get('csv') as string;
      await handleActionResponse(
        importRedirects({ csv }),
        result => {
          toast.success(`Imported ${(result as { created: number }).created} redirects`);
          setCsv('');
          router.refresh();
        }
      );
    });
  }

  return (
    <div className="grid gap-8">
      <form
        onSubmit={form.handleSubmit(onCreate)}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 text-sm">
          From
          <Controller
            name="fromPath"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>From</Label>
                  <Input id={id} {...field} required placeholder="/old-path" />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          To
          <Controller
            name="toPath"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>To</Label>
                  <Input id={id} {...field} required placeholder="/new-path" />
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <Controller
            name="statusCode"
            render={({ field, fieldState }) => {
              const id = useId();
              return (
                <FormItem>
                  <Label htmlFor={id}>Status</Label>
                  <Select
                    id={id}
                    {...field}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="301">301</SelectItem>
                      <SelectItem value="302">302</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              );
            }}
          />
        </label>
        <Button type="submit" disabled={createPending}>
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
