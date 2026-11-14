'use client';

import { useTranslations } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ExternalLink,
  Home,
  LayoutTemplate,
  Newspaper,
  PenLine,
} from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';
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
import { RelativeTime } from '@/components/atoms/relative-time';
import { useStatusLabel, useStatusOptions } from '@/i18n/use-content-labels';
import { useSiteLocales } from '@/providers/site-locales';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { maybeOfferRedirect } from '@/components/dashboard/redirect-offer';
import { useAccess } from '@/providers/access.provider';

export const PAGE_STATUS_COLORS = {
  draft: 'draft',
  review: 'pending',
  scheduled: 'in_progress',
  published: 'published',
  archived: 'archived',
} as const;

type ListT = ReturnType<typeof useTranslations<'content.list'>>;

const filtersFor = (
  locales: { label: string; value: string }[],
  statusOptions: { label: string; value: string }[],
  t: ListT
): FilterConfig[] => [
  {
    name: 'status',
    type: 'select',
    placeholder: t('allStatuses'),
    options: statusOptions,
  },
  {
    name: 'editorType',
    type: 'select',
    placeholder: t('allEditors'),
    options: [
      { label: t('visualBuilder'), value: 'builder' },
      { label: t('richText'), value: 'richtext' },
    ],
  },
  {
    name: 'language',
    type: 'select',
    placeholder: t('allLanguages'),
    options: locales,
  },
];

function RowActions({
  page,
  siteSlug,
}: {
  page: PageListItem;
  siteSlug?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { permissions, userId } = useAccess();
  const t = useTranslations('content.actions');
  const tToast = useTranslations('content.toasts');
  const canPublish = permissions.includes(PERMISSIONS.PAGES_PUBLISH);
  const canEdit =
    permissions.includes(PERMISSIONS.PAGES_EDIT) &&
    (canPublish || page.createdBy === userId);

  const run = (fn: () => Promise<unknown>, message: string) =>
    startTransition(async () => {
      await handleActionResponse(fn() as never, data => {
        toast.success(message);
        void maybeOfferRedirect(data);
        router.refresh();
      });
    });

  return (
    <ActionDropdown isLoading={isPending} variant="vertical">
      {canEdit && (
        <ActionDropdownItem
          href={PAGES.DASHBOARD.PAGES.EDIT(page.id)}
          label={t('editSettingsContent')}
        />
      )}
      {canEdit && page.editorType === 'builder' && (
        <ActionDropdownItem
          href={PAGES.DASHBOARD.PAGES.BUILDER(page.id)}
          label={t('openVisualBuilder')}
        />
      )}
      {page.status === 'published' ? (
        <ActionDropdownItem
          label={t('viewLivePage')}
          onClick={() =>
            window.open(
              PAGES.SITE.page(
                page.slug,
                page.language,
                page.isHome,
                undefined,
                siteSlug
              ),
              '_blank'
            )
          }
        />
      ) : (
        <ActionDropdownItem
          label={t('previewDraft')}
          onClick={() => window.open(PAGES.SITE.PREVIEW(page.id), '_blank')}
        />
      )}
      {permissions.includes(PERMISSIONS.PAGES_CREATE) && (
        <ActionDropdownItem
          label={t('duplicate')}
          onClick={() =>
            run(() => duplicatePage({ id: page.id }), tToast('pageDuplicated'))
          }
        />
      )}
      {canPublish &&
        (page.status === 'published' ? (
          <ActionDropdownItem
            label={t('unpublish')}
            onClick={() =>
              run(() => unpublishPage({ id: page.id }), tToast('pageUnpublished'))
            }
          />
        ) : (
          <ActionDropdownItem
            label={t('publishNow')}
            onClick={() =>
              run(() => publishPage({ id: page.id }), tToast('pagePublished'))
            }
          />
        ))}
      {permissions.includes(PERMISSIONS.PAGES_DELETE) && (
        <ActionDropdownItem
          label={t('delete')}
          className="text-red-600 dark:text-red-400"
          onClick={() => {
            if (
              confirm(t('confirmDelete', { title: page.title }))
            ) {
              run(() => deletePage({ id: page.id }), tToast('pageDeleted'));
            }
          }}
        />
      )}
    </ActionDropdown>
  );
}

const buildColumns = (
  t: ListT,
  statusLabel: (status: string) => string,
  siteSlug?: string
): ColumnDef<PageListItem>[] => [
  {
    accessorKey: 'title',
    header: t('title'),
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
                aria-label={t('homePage')}
              />
            )}
            {page.isBlogIndex && (
              <Newspaper
                className="size-3.5 text-indigo-500"
                aria-label={t('blogPage')}
              />
            )}
            {page.title}
          </Link>
          <span className="text-xs text-steel-400">
            {PAGES.SITE.page(page.slug, page.language, page.isHome, undefined, siteSlug)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: t('status'),
    enableSorting: true,
    cell: ({ row }) => {
      const { status, scheduledAt } = row.original;
      return (
        <div className="flex flex-col gap-1">
          <StatusBadge
            status={status}
            label={statusLabel(status)}
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
    header: t('editor'),
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        {row.original.editorType === 'builder' ? (
          <LayoutTemplate className="size-3" />
        ) : (
          <PenLine className="size-3" />
        )}
        {row.original.editorType === 'builder' ? t('visualBuilder') : t('richText')}
      </Badge>
    ),
  },
  {
    accessorKey: 'language',
    header: t('language'),
    cell: ({ row }) => (
      <span className="uppercase">{row.original.language}</span>
    ),
  },
  {
    accessorKey: 'authorName',
    header: t('author'),
    cell: ({ row }) => row.original.authorName ?? '—',
  },
  {
    accessorKey: 'updatedAt',
    header: t('updated'),
    enableSorting: true,
    cell: ({ row }) => (
      <RelativeTime
        date={row.original.updatedAt ?? row.original.createdAt}
        className="whitespace-nowrap text-sm"
      />
    ),
  },
  {
    id: 'actions',
    header: '',
    meta: { className: 'w-12 text-end' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {row.original.status === 'published' && (
          <a
            href={PAGES.SITE.page(
              row.original.slug,
              row.original.language,
              row.original.isHome,
              undefined,
              siteSlug
            )}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-steel-400 hover:text-steel-700"
            aria-label={t('openLivePage')}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <RowActions page={row.original} siteSlug={siteSlug} />
      </div>
    ),
  },
];

export function PagesTable({
  data,
  totalCount,
  siteSlug,
}: {
  data: PageListItem[];
  totalCount: number;
  siteSlug?: string;
}) {
  const { locales } = useSiteLocales();
  const t = useTranslations('content.list');
  const statusLabel = useStatusLabel();
  const statusOptions = useStatusOptions();
  const columns = useMemo(
    () => buildColumns(t, statusLabel, siteSlug),
    [t, statusLabel, siteSlug]
  );
  const filters = useMemo(
    () => filtersFor(locales, statusOptions, t),
    [locales, statusOptions, t]
  );
  return (
    <DataTable
      columns={columns}
      data={data}
      totalCount={totalCount}
      filters={filters}
      inlineSearch
      searchPlaceHolder={t('search')}
      showClearButton
    />
  );
}
