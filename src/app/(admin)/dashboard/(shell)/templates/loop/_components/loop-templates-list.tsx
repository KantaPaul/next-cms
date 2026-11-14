'use client';

import { format } from 'date-fns';
import { Copy, LayoutGrid, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { LoopTemplateListItem } from '@/server/services/loop-templates.service';
import {
  createLoopTemplate,
  deleteLoopTemplate,
  duplicateLoopTemplate,
} from '../_modules/loop-templates.actions';

type Source = 'posts' | 'collection' | 'external-api';

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

export function LoopTemplatesList({
  templates,
  collections,
  externalApis,
  initialCreate,
  can,
}: {
  templates: LoopTemplateListItem[];
  collections: { id: string; name: string }[];
  externalApis: { id: string; name: string }[];
  initialCreate: {
    sourceType: Source;
    collectionId: string;
    externalApiId: string;
  } | null;
  can: { delete: boolean };
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(!!initialCreate);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const duplicate = async (row: LoopTemplateListItem) => {
    setPendingId(row.id);
    await handleActionResponse(duplicateLoopTemplate({ id: row.id }), () => {
      toast.success('Template duplicated');
      router.refresh();
    });
    setPendingId(null);
  };

  const remove = async (row: LoopTemplateListItem) => {
    if (
      !confirm(
        `Delete "${row.name}"? Loop Grids using it fall back to the default card.`
      )
    )
      return;
    setPendingId(row.id);
    await handleActionResponse(deleteLoopTemplate({ id: row.id }), () => {
      toast.success('Template deleted');
      router.refresh();
    });
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-steel-500">
          A loop item is the card design a <strong>Loop Grid</strong> repeats
          for every blog post or post type entry. Design it once with dynamic
          fields, then reuse it on any page.
        </p>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> New loop item
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-steel-300 p-10 text-center dark:border-dark-300">
          <LayoutGrid className="mx-auto mb-3 size-8 text-steel-400" />
          <p className="font-medium">No loop items yet</p>
          <p className="mt-1 text-sm text-steel-500">
            Create one for blog posts or for a custom post type.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-steel-200 bg-steel-50 text-xs uppercase text-steel-500 dark:border-dark-300 dark:bg-dark-100">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {templates.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-steel-100 last:border-b-0 dark:border-dark-300"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={PAGES.DASHBOARD.LOOP_TEMPLATE(row.id)}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-steel-600 dark:text-steel-300">
                    {row.sourceType === 'posts'
                      ? 'Blog posts'
                      : row.sourceType === 'external-api'
                        ? `External API${row.externalApiName ? `: ${row.externalApiName}` : ''}`
                        : (row.collectionName ?? 'Deleted post type')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.publishedAt
                          ? 'rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }
                    >
                      {row.publishedAt ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel-500">
                    {format(new Date(row.updatedAt ?? row.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href={PAGES.DASHBOARD.LOOP_TEMPLATE(row.id)}>
                          <Pencil /> Edit
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pendingId === row.id}
                        onClick={() => duplicate(row)}
                        aria-label={`Duplicate ${row.name}`}
                      >
                        <Copy />
                      </Button>
                      {can.delete && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pendingId === row.id}
                          onClick={() => remove(row)}
                          aria-label={`Delete ${row.name}`}
                        >
                          {pendingId === row.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        collections={collections}
        externalApis={externalApis}
        initial={initialCreate}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  collections,
  externalApis,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: { id: string; name: string }[];
  externalApis: { id: string; name: string }[];
  initial: {
    sourceType: Source;
    collectionId: string;
    externalApiId: string;
  } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<Source>(
    initial?.sourceType ?? 'posts'
  );
  const [collectionId, setCollectionId] = useState(
    initial?.collectionId || collections[0]?.id || ''
  );
  const [externalApiId, setExternalApiId] = useState(
    initial?.externalApiId || externalApis[0]?.id || ''
  );
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sourceType === 'collection' && !collectionId) {
      toast.error('Choose a post type.');
      return;
    }
    if (sourceType === 'external-api' && !externalApiId) {
      toast.error('Choose a saved External API.');
      return;
    }
    setBusy(true);
    await handleActionResponse(
      createLoopTemplate({
        name: name.trim() || 'Loop item',
        sourceType,
        collectionId: sourceType === 'collection' ? collectionId : null,
        externalApiId: sourceType === 'external-api' ? externalApiId : null,
      }),
      data => {
        onOpenChange(false);
        router.push(PAGES.DASHBOARD.LOOP_TEMPLATE((data as { id: string }).id));
      }
    );
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New loop item</DialogTitle>
            <DialogDescription>
              Pick what this card shows. Its dynamic fields come from that
              source.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <input
                className={inputClass}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Blog card"
                maxLength={150}
                autoFocus
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Source
              <select
                className={inputClass}
                value={sourceType}
                onChange={e => setSourceType(e.target.value as Source)}
              >
                <option value="posts">Blog posts</option>
                <option value="collection" disabled={!collections.length}>
                  Custom post type
                  {collections.length ? '' : ' (none yet)'}
                </option>
                <option value="external-api" disabled={!externalApis.length}>
                  External API
                  {externalApis.length ? '' : ' (create one first)'}
                </option>
              </select>
            </label>
            {sourceType === 'collection' && (
              <label className="grid gap-1.5 text-sm font-medium">
                Post type
                <select
                  className={inputClass}
                  value={collectionId}
                  onChange={e => setCollectionId(e.target.value)}
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {sourceType === 'external-api' && (
              <div className="grid gap-1.5 text-sm font-medium">
                <div className="flex items-center justify-between">
                  <span>Saved External API</span>
                  <Link
                    href={PAGES.DASHBOARD.EXTERNAL_API}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Manage External APIs ↗
                  </Link>
                </div>
                <select
                  className={inputClass}
                  value={externalApiId}
                  onChange={e => setExternalApiId(e.target.value)}
                >
                  {externalApis.map(api => (
                    <option key={api.id} value={api.id}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Create and design
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
