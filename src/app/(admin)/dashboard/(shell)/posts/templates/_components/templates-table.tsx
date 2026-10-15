'use client';

import { formatDistanceToNow } from 'date-fns';
import { LayoutTemplate, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
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
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import {
  createPostTemplate,
  deletePostTemplate,
  duplicatePostTemplate,
  setDefaultPostTemplate,
  updatePostTemplate,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';

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
            toast.success('Template updated');
            onOpenChange(false);
            router.refresh();
          }
        );
        return;
      }

      await handleActionResponse(
        createPostTemplate({ name, description, fromId: fromId || null }),
        created => {
          toast.success('Template created');
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
              {editing ? 'Rename template' : 'New post template'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'The name and description show when picking a template for a post.'
                : 'Create a layout, then assign it to posts from the posts list.'}
            </DialogDescription>
          </DialogHeader>
          <FieldShell label="Name" htmlFor="template-name">
            <input
              id="template-name"
              className={inputClass}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Long read"
              maxLength={150}
              autoFocus
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
          {!editing && (
            <FieldShell
              label="Start from"
              htmlFor="template-from"
              hint="The new template starts as a copy of this layout."
            >
              <select
                id="template-from"
                className={`${inputClass} pr-8`}
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                <option value="">Built-in layout</option>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Save' : 'Create and edit layout'}
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
        label="Edit layout"
      />
      <ActionDropdownItem label="Rename" onClick={onRename} />
      <ActionDropdownItem
        label="Duplicate"
        onClick={() =>
          run(
            () => duplicatePostTemplate({ id: template.id }),
            'Template duplicated'
          )
        }
      />
      {!template.isDefault && (
        <ActionDropdownItem
          label="Set as default"
          disabled={!template.isPublished}
          title={
            template.isPublished
              ? undefined
              : 'Publish the template before making it the default'
          }
          onClick={() =>
            run(
              () => setDefaultPostTemplate({ id: template.id }),
              `"${template.name}" is now the default template`
            )
          }
        />
      )}
      {!template.isDefault && (
        <ActionDropdownItem
          label="Delete"
          className="text-red-600 dark:text-red-400"
          onClick={() => {
            const moved = template.postCount
              ? ` ${template.postCount} ${template.postCount === 1 ? 'post moves' : 'posts move'} to the default template.`
              : '';

            if (confirm(`Delete "${template.name}"?${moved}`)) {
              run(
                () => deletePostTemplate({ id: template.id }),
                'Template deleted'
              );
            }
          }}
        />
      )}
    </ActionDropdown>
  );
}

function StatusCell({ template }: { template: PostTemplateListItem }) {
  if (!template.isPublished) return <Badge variant="outline">Draft</Badge>;
  if (template.hasUnpublishedChanges)
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-amber-700 dark:text-amber-300"
      >
        Unpublished changes
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-emerald-300 text-emerald-700 dark:text-emerald-300"
    >
      Published
    </Badge>
  );
}

export function PostTemplatesTable({
  templates,
}: {
  templates: PostTemplateListItem[];
}) {
  const [details, setDetails] = useState<DetailsTarget | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDetails({ mode: 'create' })}>
          <Plus /> New template
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500 dark:bg-dark-100">
            <tr>
              <th className="px-4 py-2.5 font-medium">Template</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Posts</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
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
                          <Badge variant="secondary">Default</Badge>
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
                  {formatDistanceToNow(new Date(template.updatedAt), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-4 py-3 text-right">
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
