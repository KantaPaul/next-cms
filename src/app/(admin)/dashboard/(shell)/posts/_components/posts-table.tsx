'use client';

import { useTranslations } from 'next-intl';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ExternalLink,
  FileText,
  LayoutTemplate,
  PanelsTopLeft,
} from 'lucide-react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import {
  type LayoutLabelT,
  layoutLabel,
  SetTemplateDialog,
  useLayoutLabel,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';
import type { PostTemplateListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import {
  deletePost,
  duplicatePost,
  publishPost,
  unpublishPost,
} from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.actions';
import type { PostListItem } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
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

type ListT = ReturnType<typeof useTranslations<'content.list'>>;

const buildFilters = (
  templates: PostTemplateListItem[],
  locales: { label: string; value: string }[],
  statusOptions: { label: string; value: string }[],
  t: ListT,
  tLayout: LayoutLabelT
): FilterConfig[] => [
  {
    name: 'status',
    type: 'select',
    placeholder: t('allStatuses'),
    options: statusOptions,
  },
  {
    name: 'layout',
    type: 'select',
    placeholder: t('allLayouts'),
    options: [
      { label: tLayout('defaultTemplate'), value: 'default' },
      ...templates
        .filter(tpl => !tpl.isDefault)
        .map(tpl => ({ label: tpl.name, value: tpl.id })),
      { label: tLayout('customLayout'), value: 'custom' },
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
  post,
  templates,
  siteSlug,
}: {
  post: PostListItem;
  templates: PostTemplateListItem[];
  siteSlug?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateOpen, setTemplateOpen] = useState(false);
  const { permissions, userId } = useAccess();
  const t = useTranslations('content.actions');
  const tToast = useTranslations('content.toasts');
  const canPublish = permissions.includes(PERMISSIONS.PAGES_PUBLISH);
  const canEdit =
    permissions.includes(PERMISSIONS.PAGES_EDIT) &&
    (canPublish || post.createdBy === userId);

  const run = (fn: () => Promise<unknown>, message: string) =>
    startTransition(async () => {
      await handleActionResponse(fn() as never, data => {
        toast.success(message);
        void maybeOfferRedirect(data);
        router.refresh();
      });
    });

  return (
    <>
      <ActionDropdown isLoading={isPending} variant="vertical">
        {canEdit && (
          <ActionDropdownItem
            href={PAGES.DASHBOARD.POSTS.EDIT(post.id)}
            label={t('editPost')}
          />
        )}
        {canEdit && (
          <ActionDropdownItem
            label={t('setPostTemplate')}
            onClick={() => setTemplateOpen(true)}
          />
        )}
        {canEdit && post.layout === 'custom' && (
          <ActionDropdownItem
            href={PAGES.DASHBOARD.POSTS.BUILDER(post.id)}
            label={t('openLayoutBuilder')}
          />
        )}
        {post.status === 'published' ? (
          <ActionDropdownItem
            label={t('viewLivePost')}
            onClick={() =>
              window.open(PAGES.SITE.post(post.slug, post.language, siteSlug), '_blank')
            }
          />
        ) : (
          <ActionDropdownItem
            label={t('previewDraft')}
            onClick={() =>
              window.open(PAGES.SITE.PREVIEW_POST(post.id), '_blank')
            }
          />
        )}
        {permissions.includes(PERMISSIONS.PAGES_CREATE) && (
          <ActionDropdownItem
            label={t('duplicate')}
            onClick={() =>
              run(() => duplicatePost({ id: post.id }), tToast('postDuplicated'))
            }
          />
        )}
        {canPublish &&
          (post.status === 'published' ? (
            <ActionDropdownItem
              label={t('unpublish')}
              onClick={() =>
                run(() => unpublishPost({ id: post.id }), tToast('postUnpublished'))
              }
            />
          ) : (
            <ActionDropdownItem
              label={t('publishNow')}
              onClick={() =>
                run(() => publishPost({ id: post.id }), tToast('postPublished'))
              }
            />
          ))}
        {permissions.includes(PERMISSIONS.PAGES_DELETE) && (
          <ActionDropdownItem
            label={t('delete')}
            className="text-red-600 dark:text-red-400"
            onClick={() => {
              if (
                confirm(t('confirmDelete', { title: post.title }))
              ) {
                run(() => deletePost({ id: post.id }), tToast('postDeleted'));
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
  templates: PostTemplateListItem[],
  t: ListT,
  statusLabel: (status: string) => string,
  tLayout: LayoutLabelT,
  siteSlug?: string
): ColumnDef<PostListItem>[] => [
  {
    accessorKey: 'title',
    header: t('title'),
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
              {PAGES.SITE.post(post.slug, post.language, siteSlug)}
            </span>
          </div>
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
    accessorKey: 'layout',
    header: t('layout'),
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        {row.original.layout === 'custom' ? (
          <PanelsTopLeft className="size-3" />
        ) : (
          <LayoutTemplate className="size-3" />
        )}
        {layoutLabel(row.original, templates, tLayout)}
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
            href={PAGES.SITE.post(
              row.original.slug,
              row.original.language,
              siteSlug
            )}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-steel-400 hover:text-steel-700"
            aria-label={t('openLivePost')}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
        <RowActions post={row.original} templates={templates} siteSlug={siteSlug} />
      </div>
    ),
  },
];

export function PostsTable({
  data,
  totalCount,
  templates,
  siteSlug,
}: {
  data: PostListItem[];
  totalCount: number;
  templates: PostTemplateListItem[];
  siteSlug?: string;
}) {
  const t = useTranslations('content.list');
  const tLayout = useLayoutLabel();
  const statusLabel = useStatusLabel();
  const statusOptions = useStatusOptions();
  const columns = useMemo(
    () => buildColumns(templates, t, statusLabel, tLayout, siteSlug),
    [templates, t, statusLabel, tLayout, siteSlug]
  );
  const { locales } = useSiteLocales();
  const filters = useMemo(
    () => buildFilters(templates, locales, statusOptions, t, tLayout),
    [templates, locales, statusOptions, t, tLayout]
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
