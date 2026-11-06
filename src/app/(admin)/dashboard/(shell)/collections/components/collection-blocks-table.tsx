'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Plus, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  createCollectionBlockAction,
  updateCollectionBlockAction,
  duplicateCollectionBlockAction,
  deleteCollectionBlockAction,
} from '../_modules/collection-blocks.actions';

export type CollectionBlockItem = {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  /** Entries and single templates whose layout uses this block. */
  usage: { entries: number; templates: number };
  updatedAt: Date;
};

const usageLabel = ({ entries, templates }: CollectionBlockItem['usage']) => {
  const parts = [
    entries && `${entries} ${entries === 1 ? 'entry' : 'entries'}`,
    templates && `${templates} ${templates === 1 ? 'template' : 'templates'}`,
  ].filter(Boolean);
  return parts.length ? `Used in ${parts.join(' and ')}` : 'Not used yet';
};

type DetailsTarget =
  | { mode: 'create' }
  | { mode: 'edit'; block: CollectionBlockItem };

export function CollectionBlocksTable({
  collectionId,
  collectionSlug,
  blocks,
}: {
  collectionId: string;
  collectionSlug: string;
  blocks: CollectionBlockItem[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<DetailsTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDuplicate = async (block: CollectionBlockItem) => {
    setPendingId(block.id);
    await handleActionResponse(
      duplicateCollectionBlockAction({ id: block.id }),
      created => {
        toast.success(`Created copy of "${block.name}"`);
        if (created && typeof created === 'object' && 'id' in created) {
          router.push(
            PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
              collectionSlug,
              (created as any).id
            )
          );
        } else {
          router.refresh();
        }
      }
    );
    setPendingId(null);
  };

  const handleDelete = async (block: CollectionBlockItem) => {
    if (
      !confirm(
        block.usage.entries + block.usage.templates > 0
          ? `Delete block "${block.name}"? ${usageLabel(block.usage)}. They will show nothing for it on the live site until the block is replaced.`
          : `Delete block "${block.name}"? It is not used by any entry or template.`
      )
    ) {
      return;
    }
    setPendingId(block.id);
    await handleActionResponse(
      deleteCollectionBlockAction({ id: block.id }),
      () => {
        toast.success(`Deleted block "${block.name}"`);
        router.refresh();
      }
    );
    setPendingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-steel-500">
          Reusable blocks for this post type. Insert them in this type&apos;s
          entry builders; each one renders with the current entry&apos;s data.
        </p>
        <Button size="sm" onClick={() => setTarget({ mode: 'create' })}>
          <Plus className="size-4" /> New block
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs font-semibold uppercase text-steel-600 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-400">
            <tr>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300">
            {blocks.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  No blocks yet. Create one to design it for this post type.
                </td>
              </tr>
            ) : (
              blocks.map(block => (
                <tr
                  key={block.id}
                  className="hover:bg-steel-50/50 dark:hover:bg-dark-100/50"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Puzzle className="size-4 text-steel-400" />
                      <Link
                        href={PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
                          collectionSlug,
                          block.id
                        )}
                        className="font-semibold text-primary hover:underline"
                      >
                        {block.name}
                      </Link>
                    </div>
                    {block.description && (
                      <p className="mt-0.5 text-xs text-steel-500">
                        {block.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-steel-400">
                      {usageLabel(block.usage)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {block.isPublished ? (
                      block.hasUnpublishedChanges ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-amber-700"
                        >
                          Unpublished changes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-emerald-700"
                        >
                          Published
                        </Badge>
                      )
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-steel-300 text-steel-600"
                        title="Entries using this block show nothing for it on the live site until you publish it."
                      >
                        Not published
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs">
                    {formatDistanceToNow(new Date(block.updatedAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
                            collectionSlug,
                            block.id
                          )}
                        >
                          Open builder
                        </Link>
                      </Button>
                      <ActionDropdown isLoading={pendingId === block.id}>
                        <ActionDropdownItem
                          label="Rename / edit info"
                          onClick={() => setTarget({ mode: 'edit', block })}
                        />
                        <ActionDropdownItem
                          label="Duplicate"
                          onClick={() => handleDuplicate(block)}
                        />
                        <ActionDropdownItem
                          className="text-red-600 hover:text-red-700"
                          label="Delete"
                          onClick={() => handleDelete(block)}
                        />
                      </ActionDropdown>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BlockDetailsDialog
        target={target}
        collectionId={collectionId}
        collectionSlug={collectionSlug}
        blocks={blocks}
        onOpenChange={open => !open && setTarget(null)}
      />
    </div>
  );
}

function BlockDetailsDialog({
  target,
  collectionId,
  collectionSlug,
  blocks,
  onOpenChange,
}: {
  target: DetailsTarget | null;
  collectionId: string;
  collectionSlug: string;
  blocks: CollectionBlockItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const editing = target?.mode === 'edit' ? target.block : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [fromId, setFromId] = useState(blocks[0]?.id ?? '');
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      if (editing) {
        await handleActionResponse(
          updateCollectionBlockAction({ id: editing.id, name, description }),
          () => {
            toast.success('Block updated');
            onOpenChange(false);
            router.refresh();
          }
        );
        return;
      }

      await handleActionResponse(
        createCollectionBlockAction({
          collectionId,
          name: name.trim(),
          description: description.trim() || null,
          fromId: fromId || null,
        }),
        created => {
          toast.success('Block created');
          if (created && typeof created === 'object' && 'id' in created) {
            router.push(
              PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
                collectionSlug,
                (created as any).id
              )
            );
          } else {
            router.refresh();
          }
        }
      );
    });
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? 'Rename block' : 'New block'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'The name shows on the block chip in the entry builder.'
                : 'Create a reusable block, then design it for this post type.'}
            </DialogDescription>
          </DialogHeader>
          <FieldShell label="Name" htmlFor="block-name">
            <input
              id="block-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Member card"
              maxLength={150}
              autoFocus
              required
            />
          </FieldShell>
          <FieldShell label="Description" htmlFor="block-description">
            <textarea
              id="block-description"
              className={textareaClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What this block shows"
              maxLength={500}
            />
          </FieldShell>
          {!editing && blocks.length > 0 && (
            <FieldShell label="Start from" htmlFor="block-from">
              <select
                id="block-from"
                className={inputClass}
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                {blocks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FieldShell>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="animate-spin size-4 mr-1" />}
              {editing ? 'Save' : 'Create block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
