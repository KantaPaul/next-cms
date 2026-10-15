'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
  ExternalLink,
  FileText,
  LayoutTemplate,
  PanelsTopLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import { DataTable } from '@/components/atoms/data-table';
import { StatusBadge } from '@/components/atoms/status-badge';
import { Badge } from '@/components/ui/badge';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  pageStatusOptions,
  SUPPORTED_LANGUAGES,
} from '@/db/schemas/shared.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useAccess } from '@/providers/access.provider';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import {
  deletePost,
  duplicatePost,
  publishPost,
  unpublishPost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import type { PostListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import {
  layoutLabel,
  SetTemplateDialog,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';

const buildFilters = (templates: PostTemplateListItem[]): FilterConfig[] => [
  {
    name: 'status',
    type: 'select',
    placeholder: 'All statuses',
    options: pageStatusOptions,
  },
  {
    name: 'layout',
    type: 'select',
    placeholder: 'All layouts',
    options: [
      { label: 'Default template', value: 'default' },
      ...templates
        .filter(t => !t.isDefault)
        .map(t => ({ label: t.name, value: t.id })),
      { label: 'Custom layout', value: 'custom' },
    ],
  },
  {
    name: 'language',
    type: 'select',
    placeholder: 'All languages',
    options: SUPPORTED_LANGUAGES.map(l => ({ label: l.label, value: l.value })),
  },
];

function RowActions({
  post,
  templates,
}: {
  post: PostListItem;
  templates: PostTemplateListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateOpen, setTemplateOpen] = useState(false);
  const { permissions, userId } = useAccess();
  const canPublish = permissions.includes(PERMISSIONS.PAGES_PUBLISH);
  const canEdit =
    permissions.includes(PERMISSIONS.PAGES_EDIT) &&
    (canPublish || post.createdBy === userId);

  const run = (fn: () => Promise<unknown>, message: string) =>
    startTransition(async () => {
      await handleActionResponse(fn() as never, () => {
        toast.success(message);
        router.refresh();
      });
    });

  return (
    <>
      <ActionDropdown isLoading={isPending} variant="vertical">
        {canEdit && (
          <ActionDropdownItem
            href={PAGES.DASHBOARD.POSTS.EDIT(post.id)}
            label="Edit post"
          />
        )}
        {canEdit && (
          <ActionDropdownItem
            label="Set post template"
            onClick={() => setTemplateOpen(true)}
          />
        )}
        {canEdit && post.layout === 'custom' && (
          <ActionDropdownItem
            href={PAGES.DASHBOARD.POSTS.BUILDER(post.id)}
            label="Open layout builder"
          />
        )}
        {post.status === 'published' ? (
          <ActionDropdownItem
            label="View live post"
            onClick={() =>
              window.open(PAGES.SITE.post(post.slug, post.language), '_blank')
            }
          />
        ) : (
          <ActionDropdownItem
            label="Preview draft"
            onClick={() =>
              window.open(PAGES.SITE.PREVIEW_POST(post.id), '_blank')
            }
          />
        )}
        {permissions.includes(PERMISSIONS.PAGES_CREATE) && (
          <ActionDropdownItem
            label="Duplicate"
            onClick={() =>
              run(() => duplicatePost({ id: post.id }), 'Post duplicated')
            }
          />
        )}
        {canPublish &&
          (post.status === 'published' ? (
            <ActionDropdownItem
              label="Unpublish"
              onClick={() =>
                run(() => unpublishPost({ id: post.id }), 'Post unpublished')
              }
            />
          ) : (
            <ActionDropdownItem
              label="Publish now"
              onClick={() =>
                run(() => publishPost({ id: post.id }), 'Post published')
              }
            />
          ))}
        {permissions.includes(PERMISSIONS.PAGES_DELETE) && (
          <ActionDropdownItem
            label="Delete"
            className="text-red-600 dark:text-red-400"
            onClick={() => {
              if (
                confirm(
                  `Delete "${post.title}"? It will be removed from the site.`
                )
              ) {
                run(() => deletePost({ id: post.id }), 'Post deleted');
              }
            }}
          />
        )}
      </ActionDropdown>
      {canEdit && (
        <SetTemplateDialog
          post={post}
          templates={templates}
          open={templateOpen}
          onOpenChange={setTemplateOpen}
        />
      )}
    </>
  );
}

const buildColumns = (
  templates: PostTemplateListItem[]
): ColumnDef<PostListItem>[] => [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    cell: ({ row }) => {
      const post = row.original;
      return (
        <div className="flex min-w-60 items-center gap-3">
          {post.featuredImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featuredImage}
              alt=""
              className="size-10 shrink-0 rounded object-cover"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-steel-100 text-steel-400 dark:bg-dark-200">
              <FileText className="size-4" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href={PAGES.DASHBOARD.POSTS.EDIT(post.id)}
              className="truncate font-medium hover:underline"
            >
              {post.title}
            </Link>
            <span className="truncate text-xs text-steel-400">
              {PAGES.SITE.post(post.slug, post.language)}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    cell: ({ row }) => {
      const { status, scheduledAt } = row.original;
      return (
        <div className="flex flex-col gap-1">
          <StatusBadge
            status={status}
            statusColor={PAGE_STATUS_COLORS[status]}
          />
          {status === 'scheduled' && scheduledAt && (
            <span className="text-xs text-steel-400">
              {new Date(scheduledAt).toLocaleString()}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'layout',
    header: 'Layout',
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        {row.original.layout === 'custom' ? (
          <PanelsTopLeft className="size-3" />
        ) : (
          <LayoutTemplate className="size-3" />
        )}
        {layoutLabel(row.original, templates)}
      </Badge>
    ),
  },
  {
    accessorKey: 'language',
    header: 'Language',
    cell: ({ row }) => (
      <span className="uppercase">{row.original.language}</span>
    ),
  },
  {
    accessorKey: 'authorName',
    header: 'Author',
    cell: ({ row }) => row.original.authorName ?? '—',
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    enableSorting: true,
    cell: ({ row }) => {
      const date = row.original.updatedAt ?? row.original.createdAt;
      return (
        <span className="whitespace-nowrap text-sm">
          {formatDistanceToNow(new Date(date), { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    meta: { className: 'w-12 text-right' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {row.original.status === 'published' && (
          <a
            href={PAGES.SITE.post(row.original.slug, row.original.language)}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-steel-400 hover:text-steel-700"
            aria-label="Open live post"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <RowActions post={row.original} templates={templates} />
      </div>
    ),
  },
];

export function PostsTable({
  data,
  totalCount,
  templates,
}: {
  data: PostListItem[];
  totalCount: number;
  templates: PostTemplateListItem[];
}) {
  const columns = useMemo(() => buildColumns(templates), [templates]);
  const filters = useMemo(() => buildFilters(templates), [templates]);

  return (
    <DataTable
      columns={columns}
      data={data}
      totalCount={totalCount}
      filters={filters}
      inlineSearch
      searchPlaceHolder="Search by title or slug"
      showClearButton
    />
  );
}
