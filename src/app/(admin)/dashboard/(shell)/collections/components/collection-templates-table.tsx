'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LayoutTemplate, Loader2, Plus, Star } from 'lucide-react';
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
  createCollectionTemplateAction,
  updateCollectionTemplateAction,
  duplicateCollectionTemplateAction,
  setDefaultCollectionTemplateAction,
  deleteCollectionTemplateAction,
} from '../_modules/collection-templates.actions';

export type CollectionTemplateItem = {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  entryCount: number;
  updatedAt: Date;
};

type DetailsTarget =
  | { mode: 'create' }
  | { mode: 'edit'; template: CollectionTemplateItem };

export function CollectionTemplatesTable({
  collectionId,
  collectionSlug,
  templates,
}: {
  collectionId: string;
  collectionSlug: string;
  templates: CollectionTemplateItem[];
}) {
  const t = useTranslations('collections.templates');
  const router = useRouter();
  const [target, setTarget] = useState<DetailsTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleSetDefault = async (tmpl: CollectionTemplateItem) => {
    setPendingId(tmpl.id);
    await handleActionResponse(
      setDefaultCollectionTemplateAction({ id: tmpl.id }),
      () => {
        toast.success(t('nowDefault', { name: tmpl.name }));
        router.refresh();
      }
    );
    setPendingId(null);
  };

  const handleDuplicate = async (tmpl: CollectionTemplateItem) => {
    setPendingId(tmpl.id);
    await handleActionResponse(
      duplicateCollectionTemplateAction({ id: tmpl.id }),
      created => {
        toast.success(t('copied', { name: tmpl.name }));
        if (created && typeof created === 'object' && 'id' in created) {
          router.push(
            PAGES.DASHBOARD.COLLECTION_TEMPLATE_BUILDER(
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

  const handleDelete = async (tmpl: CollectionTemplateItem) => {
    if (
      !confirm(
        t('confirmDelete', { name: tmpl.name })
      )
    ) {
      return;
    }
    setPendingId(tmpl.id);
    await handleActionResponse(
      deleteCollectionTemplateAction({ id: tmpl.id }),
      () => {
        toast.success(t('deleted', { name: tmpl.name }));
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
              <th className="px-4 py-3 text-start">{t('colTemplate')}</th>
              <th className="px-4 py-3 text-start">{t('colStatus')}</th>
              <th className="px-4 py-3 text-start">{t('colUsedBy')}</th>
              <th className="px-4 py-3 text-start">{t('colUpdated')}</th>
              <th className="px-4 py-3 text-end">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300">
            {templates.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  {t('empty')}
                </td>
              </tr>
            ) : (
              templates.map(tmpl => (
                <tr key={tmpl.id} className="hover:bg-steel-50/50 dark:hover:bg-dark-100/50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="size-4 text-steel-400" />
                      <Link
                        href={PAGES.DASHBOARD.COLLECTION_TEMPLATE_BUILDER(
                          collectionSlug,
                          tmpl.id
                        )}
                        className="font-semibold text-primary hover:underline"
                      >
                        {tmpl.name}
                      </Link>
                      {tmpl.isDefault && (
                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Star className="size-3 fill-amber-500 text-amber-500" /> {t('default')}
                        </Badge>
                      )}
                    </div>
                    {tmpl.description && (
                      <p className="mt-0.5 text-xs text-steel-500">
                        {tmpl.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tmpl.isPublished ? (
                      tmpl.hasUnpublishedChanges ? (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          {t('unpublishedChanges')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                          {t('published')}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="border-steel-300 text-steel-600">
                        {t('draftOnly')}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel-600 dark:text-steel-400">
                    {t('entryCount', { count: tmpl.entryCount })}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs">
                    <RelativeTime date={tmpl.updatedAt} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={PAGES.DASHBOARD.COLLECTION_TEMPLATE_BUILDER(
                            collectionSlug,
                            tmpl.id
                          )}
                        >
                          {t('openBuilder')}
                        </Link>
                      </Button>
                      <ActionDropdown isLoading={pendingId === tmpl.id}>
                        {!tmpl.isDefault && (
                          <ActionDropdownItem
                            label={t('setDefault')}
                            onClick={() => handleSetDefault(tmpl)}
                          />
                        )}
                        <ActionDropdownItem
                          label={t('rename')}
                          onClick={() => setTarget({ mode: 'edit', template: tmpl })}
                        />
                        <ActionDropdownItem
                          label={t('duplicate')}
                          onClick={() => handleDuplicate(tmpl)}
                        />
                        {!tmpl.isDefault && (
                          <ActionDropdownItem
                            className="text-red-600 hover:text-red-700"
                            label={t('delete')}
                            onClick={() => handleDelete(tmpl)}
                          />
                        )}
                      </ActionDropdown>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TemplateDetailsDialog
        target={target}
        collectionId={collectionId}
        collectionSlug={collectionSlug}
        templates={templates}
        onOpenChange={open => !open && setTarget(null)}
      />
    </div>
  );
}

function TemplateDetailsDialog({
  target,
  collectionId,
  collectionSlug,
  templates,
  onOpenChange,
}: {
  target: DetailsTarget | null;
  collectionId: string;
  collectionSlug: string;
  templates: CollectionTemplateItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('collections.templates');
  const router = useRouter();
  const editing = target?.mode === 'edit' ? target.template : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [fromId, setFromId] = useState(
    templates.find(t => t.isDefault)?.id ?? ''
  );
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      if (editing) {
        await handleActionResponse(
          updateCollectionTemplateAction({ id: editing.id, name, description }),
          () => {
            toast.success(t('updated'));
            onOpenChange(false);
            router.refresh();
          }
        );
        return;
      }

      await handleActionResponse(
        createCollectionTemplateAction({
          collectionId,
          name: name.trim(),
          description: description.trim() || null,
          fromId: fromId || null,
        }),
        created => {
          toast.success(t('created'));
          if (created && typeof created === 'object' && 'id' in created) {
            router.push(
              PAGES.DASHBOARD.COLLECTION_TEMPLATE_BUILDER(
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
            <DialogTitle>
              {editing ? t('renameTitle') : t('newTitle')}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t('renameHint')
                : t('newHint')}
            </DialogDescription>
          </DialogHeader>
          <FieldShell label={t('name')} htmlFor="template-name">
            <input
              id="template-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={150}
              autoFocus
              required
            />
          </FieldShell>
          <FieldShell label={t('description')} htmlFor="template-description">
            <textarea
              id="template-description"
              className={textareaClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              maxLength={500}
            />
          </FieldShell>
          {!editing && templates.length > 0 && (
            <FieldShell label={t('startFrom')} htmlFor="template-from">
              <select
                id="template-from"
                className={inputClass}
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? t('defaultSuffix') : ''}
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
