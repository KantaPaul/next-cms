'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import {
  ExternalLink,
  Home,
  LayoutTemplate,
  Newspaper,
  PenLine,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  deletePage,
  duplicatePage,
  publishPage,
  unpublishPage,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import type { PageListItem } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import { DataTable } from '@/components/atoms/data-table';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { StatusBadge } from '@/components/atoms/status-badge';
import { Badge } from '@/components/ui/badge';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  pageStatusOptions,
  SUPPORTED_LANGUAGES,
} from '@/db/schemas/shared.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useAccess } from '@/providers/access.provider';

export const PAGE_STATUS_COLORS = {
  draft: 'draft',
  review: 'pending',
  scheduled: 'in_progress',
  published: 'published',
  archived: 'archived',
} as const;

const filters: FilterConfig[] = [
  {
    name: 'status',
    type: 'select',
    placeholder: 'All statuses',
    options: pageStatusOptions,
  },
  {
    name: 'editorType',
    type: 'select',
    placeholder: 'All editors',
    options: [
      { label: 'Visual builder', value: 'builder' },
      { label: 'Rich text', value: 'richtext' },
    ],
  },
  {
    name: 'language',
    type: 'select',
    placeholder: 'All languages',
    options: SUPPORTED_LANGUAGES.map(l => ({ label: l.label, value: l.value })),
  },
];

function RowActions({ page }: { page: PageListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { permissions, userId } = useAccess();
  const canPublish = permissions.includes(PERMISSIONS.PAGES_PUBLISH);
  const canEdit =
    permissions.includes(PERMISSIONS.PAGES_EDIT) &&
    (canPublish || page.createdBy === userId);

  const run = (fn: () => Promise<unknown>, message: string) =>
    startTransition(async () => {
      await handleActionResponse(fn() as never, () => {
        toast.success(message);
        router.refresh();
      });
    });

  return (
    <ActionDropdown isLoading={isPending} variant="vertical">
      {canEdit && (
        <ActionDropdownItem
          href={PAGES.DASHBOARD.PAGES.EDIT(page.id)}
          label="Edit settings & content"
        />
      )}
      {canEdit && page.editorType === 'builder' && (
        <ActionDropdownItem
          href={PAGES.DASHBOARD.PAGES.BUILDER(page.id)}
          label="Open visual builder"
        />
      )}
      {page.status === 'published' ? (
        <ActionDropdownItem
          label="View live page"
          onClick={() =>
            window.open(
              PAGES.SITE.page(page.slug, page.language, page.isHome),
              '_blank'
            )
          }
        />
      ) : (
        <ActionDropdownItem
          label="Preview draft"
          onClick={() => window.open(PAGES.SITE.PREVIEW(page.id), '_blank')}
        />
      )}
      {permissions.includes(PERMISSIONS.PAGES_CREATE) && (
        <ActionDropdownItem
          label="Duplicate"
          onClick={() =>
            run(() => duplicatePage({ id: page.id }), 'Page duplicated')
          }
        />
      )}
      {canPublish &&
        (page.status === 'published' ? (
          <ActionDropdownItem
            label="Unpublish"
            onClick={() =>
              run(() => unpublishPage({ id: page.id }), 'Page unpublished')
            }
          />
        ) : (
          <ActionDropdownItem
            label="Publish now"
            onClick={() =>
              run(() => publishPage({ id: page.id }), 'Page published')
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
                `Delete "${page.title}"? It will be removed from the site.`
              )
            ) {
              run(() => deletePage({ id: page.id }), 'Page deleted');
            }
          }}
        />
      )}
    </ActionDropdown>
  );
}

const columns: ColumnDef<PageListItem>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    cell: ({ row }) => {
      const page = row.original;
      return (
        <div className="flex min-w-60 flex-col gap-0.5">
          <Link
            href={PAGES.DASHBOARD.PAGES.EDIT(page.id)}
            className="flex items-center gap-1.5 font-medium hover:underline"
          >
            {page.isHome && (
              <Home
                className="size-3.5 text-indigo-500"
                aria-label="Home page"
              />
            )}
            {page.isBlogIndex && (
              <Newspaper
                className="size-3.5 text-indigo-500"
                aria-label="Blog page"
              />
            )}
            {page.title}
          </Link>
          <span className="text-xs text-steel-400">
            {PAGES.SITE.page(page.slug, page.language, page.isHome)}
          </span>
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
    accessorKey: 'editorType',
    header: 'Editor',
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        {row.original.editorType === 'builder' ? (
          <LayoutTemplate className="size-3" />
        ) : (
          <PenLine className="size-3" />
        )}
        {row.original.editorType === 'builder' ? 'Visual builder' : 'Rich text'}
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
            href={PAGES.SITE.page(
              row.original.slug,
              row.original.language,
              row.original.isHome
            )}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-steel-400 hover:text-steel-700"
            aria-label="Open live page"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <RowActions page={row.original} />
      </div>
    ),
  },
];

export function PagesTable({
  data,
  totalCount,
}: {
  data: PageListItem[];
  totalCount: number;
}) {
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
