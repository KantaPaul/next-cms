'use client';

import { useState, useTransition } from 'react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
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
  const router = useRouter();
  const [target, setTarget] = useState<DetailsTarget | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleSetDefault = async (tmpl: CollectionTemplateItem) => {
    setPendingId(tmpl.id);
    await handleActionResponse(
      setDefaultCollectionTemplateAction({ id: tmpl.id }),
      () => {
        toast.success(`"${tmpl.name}" is now the default template`);
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
        toast.success(`Created copy of "${tmpl.name}"`);
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
        `Delete template "${tmpl.name}"? Entries assigned to it will fall back to the default template.`
      )
    ) {
      return;
    }
    setPendingId(tmpl.id);
    await handleActionResponse(
      deleteCollectionTemplateAction({ id: tmpl.id }),
      () => {
        toast.success(`Deleted template "${tmpl.name}"`);
        router.refresh();
      }
    );
    setPendingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-steel-500">
          Single-entry layouts for this post type. The default template applies to
          every entry that hasn&rsquo;t picked another one.
        </p>
        <Button size="sm" onClick={() => setTarget({ mode: 'create' })}>
          <Plus className="size-4" /> New template
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50">
        <table className="w-full text-start text-sm">
          <thead className="border-b border-steel-200 bg-steel-50 text-xs font-semibold uppercase text-steel-600 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-400">
            <tr>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Used by</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300">
            {templates.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-steel-500"
                >
                  No single templates defined yet.
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
                          <Star className="size-3 fill-amber-500 text-amber-500" /> Default
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
                          Unpublished changes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                          Published
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="border-steel-300 text-steel-600">
                        Draft only
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel-600 dark:text-steel-400">
                    {tmpl.entryCount} {tmpl.entryCount === 1 ? 'entry' : 'entries'}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs">
                    {formatDistanceToNow(new Date(tmpl.updatedAt), {
                      addSuffix: true,
                    })}
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
                          Open builder
                        </Link>
                      </Button>
                      <ActionDropdown isLoading={pendingId === tmpl.id}>
                        {!tmpl.isDefault && (
                          <ActionDropdownItem
                            label="Set as default"
                            onClick={() => handleSetDefault(tmpl)}
                          />
                        )}
                        <ActionDropdownItem
                          label="Rename / edit info"
                          onClick={() => setTarget({ mode: 'edit', template: tmpl })}
                        />
                        <ActionDropdownItem
                          label="Duplicate"
                          onClick={() => handleDuplicate(tmpl)}
                        />
                        {!tmpl.isDefault && (
                          <ActionDropdownItem
                            className="text-red-600 hover:text-red-700"
                            label="Delete"
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
            toast.success('Template updated');
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
          toast.success('Template created');
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
              {editing ? 'Rename template' : 'New single template'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'The name and description show when picking a template for an entry.'
                : 'Create a single layout, then assign it to entries or set it as default.'}
            </DialogDescription>
          </DialogHeader>
          <FieldShell label="Name" htmlFor="template-name">
            <input
              id="template-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Profile layout"
              maxLength={150}
              autoFocus
              required
            />
          </FieldShell>
          <FieldShell label="Description" htmlFor="template-description">
            <textarea
              id="template-description"
              className={textareaClass}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="When to use this layout"
              maxLength={500}
            />
          </FieldShell>
          {!editing && templates.length > 0 && (
            <FieldShell label="Start from" htmlFor="template-from">
              <select
                id="template-from"
                className={inputClass}
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isDefault ? '(default)' : ''}
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
              {isPending && <Loader2 className="animate-spin size-4 me-1" />}
              {editing ? 'Save' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
