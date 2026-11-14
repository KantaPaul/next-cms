'use client';

import { useTranslations } from 'next-intl';
import { LayoutTemplate, Loader2, Plus } from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import {
  createPostTemplate,
  deletePostTemplate,
  duplicatePostTemplate,
  setDefaultPostTemplate,
  updatePostTemplate,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import { Badge } from '@/components/ui/badge';
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
import { RelativeTime } from '@/components/atoms/relative-time';
import { handleActionResponse } from '@/lib/utils/handle-action-response';

type DetailsTarget =
  | { mode: 'create' }
  | { mode: 'edit'; template: PostTemplateListItem };

function TemplateDetailsDialog({
  target,
  templates,
  onOpenChange,
}: {
  target: DetailsTarget | null;
  templates: PostTemplateListItem[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useTranslations('posts.templates');
  const editing = target?.mode === 'edit' ? target.template : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [fromId, setFromId] = useState(
    templates.find(t => t.isDefault)?.id ?? ''
  );
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (editing) {
        await handleActionResponse(
          updatePostTemplate({ id: editing.id, name, description }),
          () => {
            toast.success(t('updated'));
            onOpenChange(false);
            router.refresh();
          }
        );
        return;
      }

      await handleActionResponse(
        createPostTemplate({ name, description, fromId: fromId || null }),
        created => {
          toast.success(t('created'));
          router.push(PAGES.DASHBOARD.POSTS.TEMPLATE_BUILDER(created.id));
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
              {editing ? t('renameHint') : t('newHint')}
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
          {!editing && (
            <FieldShell
              label={t('startFrom')}
              htmlFor="template-from"
              hint={t('startFromHint')}
            >
              <select
                id="template-from"
                className={`${inputClass} pe-8`}
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                <option value="">{t('builtIn')}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
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
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? t('save') : t('createAndEdit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RowActions({
  template,
  onRename,
}: {
  template: PostTemplateListItem;
  onRename: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('posts.templates');

  const run = (
    fn: () => Promise<unknown>,
    message: string,
    after?: () => void
  ) =>
    startTransition(async () => {
      await handleActionResponse(fn() as never, () => {
        toast.success(message);
        after?.();
        router.refresh();
      });
    });

  return (
    <ActionDropdown isLoading={isPending} variant="vertical">
      <ActionDropdownItem
        href={PAGES.DASHBOARD.POSTS.TEMPLATE_BUILDER(template.id)}
        label={t('editLayout')}
      />
      <ActionDropdownItem label={t('rename')} onClick={onRename} />
      <ActionDropdownItem
        label={t('duplicate')}
        onClick={() =>
          run(
            () => duplicatePostTemplate({ id: template.id }),
            t('duplicated')
          )
        }
      />
      {!template.isDefault && (
        <ActionDropdownItem
          label={t('setDefault')}
          disabled={!template.isPublished}
          title={
            template.isPublished
              ? undefined
              : t('publishFirst')
          }
          onClick={() =>
            run(
              () => setDefaultPostTemplate({ id: template.id }),
              t('nowDefault', { name: template.name })
            )
          }
        />
      )}
      {!template.isDefault && (
        <ActionDropdownItem
          label={t('delete')}
          className="text-red-600 dark:text-red-400"
          onClick={() => {
            const question = t('confirmDelete', { name: template.name });
            const moved = template.postCount
              ? ` ${t('postsMove', { count: template.postCount })}`
              : '';

            if (confirm(`${question}${moved}`)) {
              run(
                () => deletePostTemplate({ id: template.id }),
                t('deleted')
              );
            }
          }}
        />
      )}
    </ActionDropdown>
  );
}

function StatusCell({ template }: { template: PostTemplateListItem }) {
  const t = useTranslations('posts.templates');
  if (!template.isPublished) return <Badge variant="outline">{t('draft')}</Badge>;
  if (template.hasUnpublishedChanges)
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-amber-700 dark:text-amber-300"
      >
        {t('unpublishedChanges')}
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-emerald-300 text-emerald-700 dark:text-emerald-300"
    >
      {t('published')}
    </Badge>
  );
}

export function PostTemplatesTable({
  templates,
}: {
  templates: PostTemplateListItem[];
}) {
  const [details, setDetails] = useState<DetailsTarget | null>(null);
  const t = useTranslations('posts.templates');

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDetails({ mode: 'create' })}>
          <Plus /> {t('newTemplate')}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-steel-50 text-start text-xs uppercase tracking-wide text-steel-500 dark:bg-dark-100">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">{t('colTemplate')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{t('colStatus')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{t('colPosts')}</th>
              <th className="px-4 py-2.5 text-start font-medium">{t('colUpdated')}</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 dark:divide-dark-300">
            {templates.map(template => (
              <tr key={template.id}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded bg-steel-100 text-steel-500 dark:bg-dark-200">
                      <LayoutTemplate className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={PAGES.DASHBOARD.POSTS.TEMPLATE_BUILDER(
                            template.id
                          )}
                          className="font-medium hover:underline"
                        >
                          {template.name}
                        </Link>
                        {template.isDefault && (
                          <Badge variant="secondary">{t('default')}</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-steel-500">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusCell template={template} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`${PAGES.DASHBOARD.POSTS.INDEX}?layout=${template.isDefault ? 'default' : template.id}`}
                    className="hover:underline"
                  >
                    {template.postCount}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-steel-500">
                  <RelativeTime date={template.updatedAt} />
                </td>
                <td className="px-4 py-3 text-end">
                  <RowActions
                    template={template}
                    onRename={() => setDetails({ mode: 'edit', template })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TemplateDetailsDialog
        key={
          details
            ? details.mode === 'edit'
              ? details.template.id
              : 'create'
            : 'closed'
        }
        target={details}
        templates={templates}
        onOpenChange={open => !open && setDetails(null)}
      />
    </>
  );
}
