'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
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
  layoutLabel,
  SetTemplateDialog,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';
import {
  deleteEntryAction,
  duplicateEntryAction,
  publishEntryAction,
  setEntryTemplateAction,
  switchEntryLayoutAction,
  unpublishEntryAction,
} from '../_modules/collections.actions';
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
import { entryTitle } from '@/config/post-types';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useAccess } from '@/providers/access.provider';
import { useSiteLocales } from '@/providers/site-locales';

export type EntryListItem = {
  id: string;
  collectionId: string;
  slug: string;
  status: string;
  visibility: string;
  layout: string;
  templateId: string | null;
  templateName: string | null;
  scheduledAt: Date | string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  authorId: string | null;
  authorName: string | null;
  language?: string;
  translationGroupId?: string | null;
  data: Record<string, unknown> | null;
  excerpt: string | null;
  featuredImage: string | null;
};

export type CollectionTemplateItem = {
  id: string;
  name: string;
  isDefault: boolean;
};

const STATUS_OPTIONS = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Under review', value: 'review' },
  { label: 'Scheduled', value: 'scheduled' },
];

const buildFilters = (
  templates: CollectionTemplateItem[],
  locales: { label: string; value: string }[]
): FilterConfig[] => [
  ...(locales.length > 1
    ? [
        {
          name: 'language',
          type: 'select',
          placeholder: 'All languages',
          options: locales,
        } as FilterConfig,
      ]
    : []),
  {
    name: 'status',
    type: 'select',
    placeholder: 'All statuses',
    options: STATUS_OPTIONS,
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
];

function getImageSrc(entry: EntryListItem): string | null {
  if (entry.featuredImage) return entry.featuredImage;
  const d = entry.data ?? {};
  for (const key of ['photo', 'image', 'avatar', 'picture', 'thumbnail', 'cover']) {
    const val = d[key];
    if (typeof val === 'string' && val.trim().length > 0) return val;
  }
  return null;
}

function RowActions({
  entry,
  collectionSlug,
  templates,
  fields,
}: {
  entry: EntryListItem;
  collectionSlug: string;
  templates: CollectionTemplateItem[];
  fields: { key: string; label: string; type: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateOpen, setTemplateOpen] = useState(false);
  const { permissions, userId } = useAccess();
  const canPublish = permissions.includes(PERMISSIONS.PAGES_PUBLISH);
  const canEdit =
    permissions.includes(PERMISSIONS.PAGES_EDIT) &&
    (canPublish || entry.authorId === userId);

  const displayTitle = entryTitle(entry.data, fields) || entry.slug;

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
            href={PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(collectionSlug, entry.id)}
            label="Edit entry"
          />
        )}
        {canEdit && (
          <ActionDropdownItem
            label="Set entry template"
            onClick={() => setTemplateOpen(true)}
          />
        )}
        {canEdit && entry.layout === 'custom' && (
          <ActionDropdownItem
            href={PAGES.DASHBOARD.COLLECTION_ENTRY_BUILDER(collectionSlug, entry.id)}
            label="Open layout builder"
          />
        )}
        {entry.status === 'published' ? (
          <ActionDropdownItem
            label="View live entry"
            onClick={() =>
              window.open(`/${collectionSlug}/${entry.slug}`, '_blank')
            }
          />
        ) : (
          <ActionDropdownItem
            label="Preview draft"
            onClick={() =>
              window.open(`/${collectionSlug}/${entry.slug}`, '_blank')
            }
          />
        )}
        {permissions.includes(PERMISSIONS.PAGES_CREATE) && (
          <ActionDropdownItem
            label="Duplicate"
            onClick={() =>
              run(
                () => duplicateEntryAction({ id: entry.id }),
                'Entry duplicated'
              )
            }
          />
        )}
        {canPublish &&
          (entry.status === 'published' ? (
            <ActionDropdownItem
              label="Unpublish"
              onClick={() =>
                run(
                  () => unpublishEntryAction({ id: entry.id }),
                  'Entry unpublished'
                )
              }
            />
          ) : (
            <ActionDropdownItem
              label="Publish now"
              onClick={() =>
                run(
                  () => publishEntryAction({ id: entry.id }),
                  'Entry published'
                )
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
                  `Delete "${displayTitle}"? It will be removed from the site.`
                )
              ) {
                run(
                  () => deleteEntryAction({ id: entry.id, collectionSlug }),
                  'Entry deleted'
                );
              }
            }}
          />
        )}
      </ActionDropdown>
      {canEdit && (
        <SetTemplateDialog
          post={{
            id: entry.id,
            title: displayTitle,
            layout: (entry.layout as 'template' | 'custom') || 'template',
            templateId: entry.templateId,
          }}
          templates={templates}
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          title="Set entry template"
          onSwitchLayout={layout =>
            switchEntryLayoutAction({ id: entry.id, layout })
          }
          onSetTemplate={templateId =>
            setEntryTemplateAction({ id: entry.id, templateId })
          }
        />
      )}
    </>
  );
}

const buildColumns = (
  collectionSlug: string,
  siteSlug: string,
  templates: CollectionTemplateItem[],
  fields: { key: string; label: string; type: string }[],
  defaultLocale = 'en'
): ColumnDef<EntryListItem>[] => {
  // Up to two key custom fields (excluding name/title which is already primary)
  const extraFields = fields
    .filter(
      f =>
        f.type === 'text' &&
        f.key !== 'title' &&
        f.key !== 'name'
    )
    .slice(0, 2);

  const cols: ColumnDef<EntryListItem>[] = [
    {
      accessorKey: 'slug',
      header: 'Title / Slug',
      enableSorting: true,
      cell: ({ row }) => {
        const entry = row.original;
        const title = entryTitle(entry.data, fields) || entry.slug;
        const imgSrc = getImageSrc(entry);

        return (
          <div className="flex min-w-56 items-center gap-3">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
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
                href={PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(
                  collectionSlug,
                  entry.id
                )}
                className="truncate font-medium hover:underline"
              >
                {title}
              </Link>
              <span className="truncate text-xs text-steel-400">
                {PAGES.SITE.entry(
                  collectionSlug,
                  entry.slug,
                  entry.language ?? defaultLocale,
                  defaultLocale,
                  siteSlug || undefined
                )}
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
              statusColor={
                PAGE_STATUS_COLORS[status as keyof typeof PAGE_STATUS_COLORS] ??
                'draft'
              }
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
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <Badge variant="outline" className="gap-1">
            {entry.layout === 'custom' ? (
              <PanelsTopLeft className="size-3" />
            ) : (
              <LayoutTemplate className="size-3" />
            )}
            {layoutLabel(
              {
                layout: (entry.layout as 'template' | 'custom') || 'template',
                templateId: entry.templateId,
                templateName: entry.templateName,
              },
              templates
            )}
          </Badge>
        );
      },
    },
  ];

  // Extra custom fields
  for (const f of extraFields) {
    cols.push({
      id: `data-${f.key}`,
      header: f.label,
      cell: ({ row }) => {
        const val = row.original.data?.[f.key];
        return (
          <span className="text-sm text-steel-600 dark:text-steel-300">
            {val ? String(val).slice(0, 40) : '—'}
          </span>
        );
      },
    });
  }

  cols.push(
    {
      accessorKey: 'language',
      header: 'Language',
      cell: ({ row }) => (
        <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs font-medium uppercase text-steel-600 dark:bg-dark-200 dark:text-steel-300">
          {row.original.language ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'authorName',
      header: 'Author',
      cell: ({ row }) => (
        <span className="text-sm text-steel-600 dark:text-steel-300">
          {row.original.authorName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      enableSorting: true,
      cell: ({ row }) => {
        const date = row.original.updatedAt ?? row.original.createdAt;
        return (
          <span className="whitespace-nowrap text-sm text-steel-500">
            {date
              ? formatDistanceToNow(new Date(date), { addSuffix: true })
              : '—'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-end' },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {row.original.status === 'published' && (
            <a
              href={PAGES.SITE.entry(
                collectionSlug,
                row.original.slug,
                row.original.language ?? defaultLocale,
                defaultLocale,
                siteSlug || undefined
              )}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-steel-400 hover:text-steel-700"
              aria-label="Open live entry"
            >
              <ExternalLink className="size-4" />
            </a>
          )}
          <RowActions
            entry={row.original}
            collectionSlug={collectionSlug}
            templates={templates}
            fields={fields}
          />
        </div>
      ),
    }
  );

  return cols;
};

export function EntriesTable({
  data,
  totalCount,
  collectionSlug,
  templates,
  fields,
  siteSlug,
}: {
  data: EntryListItem[];
  totalCount: number;
  collectionSlug: string;
  templates: CollectionTemplateItem[];
  fields: { key: string; label: string; type: string }[];
  siteSlug: string;
}) {
  const { locales, defaultLocale } = useSiteLocales();
  const columns = useMemo(
    () =>
      buildColumns(collectionSlug, siteSlug, templates, fields, defaultLocale),
    [collectionSlug, siteSlug, templates, fields, defaultLocale]
  );

  const filters = useMemo(
    () => buildFilters(templates, locales),
    [templates, locales]
  );

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
