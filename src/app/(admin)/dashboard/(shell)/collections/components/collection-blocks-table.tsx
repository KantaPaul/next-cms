'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
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
import { RelativeTime } from '@/components/atoms/relative-time';
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

type BlocksT = ReturnType<typeof useTranslations<'collections.blocks'>>;

const usageLabel = (
  { entries, templates }: CollectionBlockItem['usage'],
  t: BlocksT
) => {
  const entriesText = entries ? t('entries', { count: entries }) : '';
  const templatesText = templates ? t('templatesCount', { count: templates }) : '';
  if (entriesText && templatesText)
    return t('usedInBoth', { entries: entriesText, templates: templatesText });
  if (entriesText || templatesText)
    return t('usedIn', { items: entriesText || templatesText });
  return t('notUsed');
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
  const t = useTranslations('collections.blocks');
  const router = useRouter();
  const [target, setTarget] = useState<DetailsTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleDuplicate = async (block: CollectionBlockItem) => {
    setPendingId(block.id);
    await handleActionResponse(
      duplicateCollectionBlockAction({ id: block.id }),
      created => {
        toast.success(t('copied', { name: block.name }));
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
          ? t('confirmDeleteUsed', { name: block.name, usage: usageLabel(block.usage, t) })
          : t('confirmDeleteUnused', { name: block.name })
      )
    ) {
      return;
    }
    setPendingId(block.id);
    await handleActionResponse(
      deleteCollectionBlockAction({ id: block.id }),
      () => {
        toast.success(t('deleted', { name: block.name }));
        router.refresh();
      }
    );
    setPendingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-steel-500">
          {t('intro')}
        </p>
        <Button size="sm" onClick={() => setTarget({ mode: 'create' })}>
          <Plus className="size-4" /> {t('new')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs font-semibold uppercase text-steel-600 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-400">
            <tr>
              <th className="px-4 py-3 text-start">{t('colBlock')}</th>
              <th className="px-4 py-3 text-start">{t('colStatus')}</th>
              <th className="px-4 py-3 text-start">{t('colUpdated')}</th>
              <th className="px-4 py-3 text-end">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300">
            {blocks.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t('empty')}
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
                      {usageLabel(block.usage, t)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {block.isPublished ? (
                      block.hasUnpublishedChanges ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-amber-700"
                        >
                          {t('unpublishedChanges')}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-emerald-700"
                        >
                          {t('published')}
                        </Badge>
                      )
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-steel-300 text-steel-600"
                        title={t('notPublishedHint')}
                      >
                        {t('notPublished')}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs">
                    <RelativeTime date={block.updatedAt} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
                            collectionSlug,
                            block.id
                          )}
                        >
                          {t('openBuilder')}
                        </Link>
                      </Button>
                      <ActionDropdown isLoading={pendingId === block.id}>
                        <ActionDropdownItem
                          label={t('rename')}
                          onClick={() => setTarget({ mode: 'edit', block })}
                        />
                        <ActionDropdownItem
                          label={t('duplicate')}
                          onClick={() => handleDuplicate(block)}
                        />
                        <ActionDropdownItem
                          className="text-red-600 hover:text-red-700"
                          label={t('delete')}
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
  const t = useTranslations('collections.blocks');
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
            toast.success(t('updated'));
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
          toast.success(t('created'));
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
            <DialogTitle>{editing ? t('renameTitle') : t('newTitle')}</DialogTitle>
            <DialogDescription>
              {editing
                ? t('renameHint')
                : t('newHint')}
            </DialogDescription>
          </DialogHeader>
          <FieldShell label={t('name')} htmlFor="block-name">
            <input
              id="block-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={150}
              autoFocus
              required
            />
          </FieldShell>
          <FieldShell label={t('description')} htmlFor="block-description">
            <textarea
              id="block-description"
              className={textareaClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              maxLength={500}
            />
          </FieldShell>
          {!editing && blocks.length > 0 && (
            <FieldShell label={t('startFrom')} htmlFor="block-from">
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
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="animate-spin size-4 me-1" />}
              {editing ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
