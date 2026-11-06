'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Archive, Check, Globe, LayoutPanelTop, LayoutTemplate, PanelBottom, PanelTop, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import {
  STARTERS_BY_CATEGORY,
  type SiteTemplateCategory,
} from '@/db/seed/header-footer-starters';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import { DataTable } from '@/components/atoms/data-table';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { HeaderFooterItem } from '../_modules/header-footer.service';
import {
  createHeaderFooter,
  deleteHeaderFooter,
  duplicateHeaderFooter,
  renameHeaderFooter,
} from '../_modules/header-footer.actions';
import { siteTemplateEditHref } from '../_modules/site-template-href';
import { DisplayConditionsDialog } from './display-conditions-dialog';

const TABS: {
  value: SiteTemplateCategory;
  label: string;
  icon: typeof PanelTop;
  emptyHint: string;
}[] = [
  {
    value: 'Header',
    label: 'Headers',
    icon: PanelTop,
    emptyHint: 'Create a header here, customize it in the visual builder, then assign it in Settings or on individual pages.',
  },
  {
    value: 'Footer',
    label: 'Footers',
    icon: PanelBottom,
    emptyHint: 'Create a footer here, customize it in the visual builder, then assign it in Settings or on individual pages.',
  },
  {
    value: 'Search',
    label: 'Search',
    icon: Search,
    emptyHint: 'Design the /search results page, then assign it in Settings → Search Results Template.',
  },
  {
    value: 'Archive',
    label: 'Archives',
    icon: Archive,
    emptyHint: 'Design category, tag, author, and date archive pages, then assign it in Settings → Archive Template.',
  },
  {
    value: 'MegaMenu',
    label: 'Mega menus',
    icon: LayoutPanelTop,
    emptyHint: 'Design a wide dropdown panel in the visual builder, then attach it to a top-level item on the Menus screen.',
  },
];

/** Lower-case name for sentences: "header", "mega menu". */
const noun = (c: SiteTemplateCategory) =>
  c === 'MegaMenu' ? 'mega menu' : c.toLowerCase();
/** Capitalised name for toasts: "Header", "Mega menu". */
const title = (c: SiteTemplateCategory) =>
  c === 'MegaMenu' ? 'Mega menu' : c;

const FILTERS: FilterConfig[] = [
  {
    name: 'status',
    type: 'select',
    placeholder: 'All statuses',
    options: [
      { label: 'Published', value: 'published' },
      { label: 'Draft', value: 'draft' },
      { label: 'Draft changes', value: 'changes' },
    ],
  },
  {
    name: 'assigned',
    type: 'select',
    placeholder: 'Any assignment',
    options: [
      { label: 'Site default', value: 'default' },
      { label: 'In use', value: 'in-use' },
      { label: 'Unused', value: 'unused' },
    ],
  },
];

function StatusChip({ item }: { item: HeaderFooterItem }) {
  if (!item.isPublished)
    return (
      <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[10px] font-medium text-steel-600 dark:bg-dark-200 dark:text-steel-400">
        Draft
      </span>
    );
  if (item.hasDraftChanges)
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Draft changes
      </span>
    );
  return (
    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      Published
    </span>
  );
}

function AssignedCell({ item }: { item: HeaderFooterItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {item.isSiteDefault && (
        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Globe className="size-3" />
          Site default
        </span>
      )}
      {item.locales.map(code => (
        <span
          key={code}
          className="rounded bg-steel-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase text-steel-700 dark:bg-dark-200 dark:text-steel-300"
        >
          {code}
        </span>
      ))}
      {item.pageCount > 0 && (
        <span className="text-steel-500 dark:text-steel-400">
          {item.pageCount} page{item.pageCount > 1 ? 's' : ''}
        </span>
      )}
      {item.menuItemCount > 0 && (
        <span className="text-steel-500 dark:text-steel-400">
          {item.menuItemCount} menu item{item.menuItemCount > 1 ? 's' : ''}
        </span>
      )}
      {item.ruleCount > 0 && (
        <span className="text-steel-500 dark:text-steel-400">
          {item.ruleCount} display rule{item.ruleCount > 1 ? 's' : ''}
        </span>
      )}
      {!item.inUse && <span className="text-steel-400">—</span>}
    </div>
  );
}

export function HeaderFooterList({
  rows,
  totalCount,
  tabCounts,
  kpis,
  initialTab = 'Header',
  can,
}: {
  rows: HeaderFooterItem[];
  totalCount: number;
  tabCounts: Record<SiteTemplateCategory, number>;
  kpis: { label: string; value: number }[];
  initialTab?: SiteTemplateCategory;
  can: { create: boolean; delete: boolean };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SiteTemplateCategory>(initialTab);

  // Sidebar submenu links change ?type= without remounting this list.
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // A new tab starts unfiltered on its first page.
  const changeTab = (tab: SiteTemplateCategory) => {
    setActiveTab(tab);
    router.replace(`?type=${tab.toLowerCase()}`, { scroll: false });
  };
  const [renaming, setRenaming] = useState<HeaderFooterItem | null>(null);
  const [conditionsItem, setConditionsItem] = useState<HeaderFooterItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const currentTab = TABS.find(t => t.value === activeTab)!;
  const isEmptyCategory = tabCounts[activeTab] === 0;

  const remove = async (item: HeaderFooterItem) => {
    let warning = `Delete the "${item.name}" ${noun(item.category)}?`;
    if (item.isSiteDefault) {
      warning = `"${item.name}" is currently set as the site default ${noun(item.category)}! Deleting it will fall back to the built-in layout. Delete anyway?`;
    } else if (item.pageCount > 0) {
      warning = `"${item.name}" is used on ${item.pageCount} page${item.pageCount > 1 ? 's' : ''}. Delete anyway?`;
    } else if (item.inUse) {
      warning = `"${item.name}" is still assigned. Delete anyway?`;
    }
    if (!confirm(warning)) return;

    setPendingId(item.id);
    await handleActionResponse(deleteHeaderFooter({ id: item.id }), () => {
      toast.success(`${title(item.category)} deleted`);
      router.refresh();
    });
    setPendingId(null);
  };

  const duplicate = async (item: HeaderFooterItem) => {
    setPendingId(item.id);
    await handleActionResponse(duplicateHeaderFooter({ id: item.id }), () => {
      toast.success(`${title(item.category)} duplicated`);
      router.refresh();
    });
    setPendingId(null);
  };

  const columns = useMemo<ColumnDef<HeaderFooterItem>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              href={siteTemplateEditHref(row.original.id, row.original.category)}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <StatusChip item={row.original} />
          </div>
        ),
      },
      {
        id: 'assigned',
        header: 'Assigned as',
        cell: ({ row }) => <AssignedCell item={row.original} />,
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-xs text-steel-500">
            {row.original.updatedAt
              ? format(new Date(row.original.updatedAt), 'MMM d, yyyy')
              : '—'}
          </span>
        ),
      },
      {
        id: 'author',
        header: 'Author',
        cell: ({ row }) => (
          <span className="text-xs text-steel-500">
            {row.original.createdByName ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex justify-end">
              <ActionDropdown isLoading={pendingId === item.id} variant="vertical">
                <ActionDropdownItem
                  href={siteTemplateEditHref(item.id, item.category)}
                  label="Edit in builder"
                />
                {item.category !== 'MegaMenu' && (
                  <ActionDropdownItem
                    label="Display conditions"
                    onClick={() => setConditionsItem(item)}
                  />
                )}
                <ActionDropdownItem label="Duplicate" onClick={() => duplicate(item)} />
                <ActionDropdownItem label="Rename" onClick={() => setRenaming(item)} />
                {can.delete && (
                  <ActionDropdownItem
                    label="Delete"
                    className="text-red-600 dark:text-red-400"
                    onClick={() => remove(item)}
                  />
                )}
              </ActionDropdown>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingId, can.delete]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel-500">
          Design header, footer, search results, and archive layouts in the visual builder. Assign them as site defaults, locale overrides, or (headers and footers) on specific pages.
        </p>
        {can.create && (
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 size-4" />
            New {noun(activeTab)} template
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={v => changeTab(v as SiteTemplateCategory)}
        className="w-full"
      >
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2"
            >
              <tab.icon className="size-4" />
              {tab.label} ({tabCounts[tab.value] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="rounded-lg border border-steel-200 px-4 py-3 dark:border-dark-300"
          >
            <div className="text-xs uppercase tracking-wide text-steel-400">
              {kpi.label}
            </div>
            <div className="text-2xl font-semibold">{kpi.value}</div>
          </div>
        ))}
      </div>

      {isEmptyCategory ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-steel-200 px-6 py-12 text-center dark:border-dark-300">
          <LayoutTemplate className="size-8 text-steel-300" />
          <p className="font-medium">
            No {noun(activeTab)} templates yet
          </p>
          <p className="max-w-md text-sm text-steel-500">
            {currentTab.emptyHint}
          </p>
        </div>
      ) : (
        <DataTable
          key={`table-${activeTab}`}
          columns={columns}
          data={rows}
          totalCount={totalCount}
          filters={FILTERS}
          inlineSearch
          searchPlaceHolder="Search templates by name"
          showClearButton
        />
      )}

      <NewHeaderFooterDialog
        key={`new-${activeTab}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        category={activeTab}
      />

      {renaming && (
        <RenameDialog
          item={renaming}
          open={!!renaming}
          onOpenChange={open => !open && setRenaming(null)}
        />
      )}

      {conditionsItem && (
        <DisplayConditionsDialog
          item={conditionsItem}
          open={!!conditionsItem}
          onOpenChange={open => !open && setConditionsItem(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function NewHeaderFooterDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SiteTemplateCategory;
}) {
  const router = useRouter();
  const starters = STARTERS_BY_CATEGORY[category];
  const blankName = `Blank ${noun(category)}`;
  const defaultStarter = starters[0]?.key ?? 'blank';
  const nameFor = (key: string) =>
    key === 'blank' ? blankName : (starters.find(s => s.key === key)?.name ?? '');
  const [name, setName] = useState(() => nameFor(defaultStarter));
  const [nameTouched, setNameTouched] = useState(false);
  const [starter, setStarter] = useState<string>(defaultStarter);
  const [isPending, startTransition] = useTransition();

  // Fresh form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStarter(defaultStarter);
    setName(nameFor(defaultStarter));
    setNameTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const pickStarter = (key: string) => {
    setStarter(key);
    // Follow the starter's name until the user types their own.
    if (!nameTouched || !name.trim()) {
      setName(nameFor(key));
      setNameTouched(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      await handleActionResponse(
        createHeaderFooter({
          name: name.trim(),
          category,
          starter,
        }),
        row => {
          toast.success(`${title(category)} created`);
          onOpenChange(false);
          router.push(siteTemplateEditHref(row.id, category));
        }
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New {noun(category)} template</DialogTitle>
            <DialogDescription>
              Create a new {noun(category)} layout in the visual builder, or start from a starter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              <span>Name</span>
              <FormInput
                placeholder={`e.g. Main ${noun(category)}, Landing ${noun(category)}`}
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setNameTouched(true);
                }}
                maxLength={150}
                required
                autoFocus
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-steel-700 dark:text-steel-300">
                Choose a starter template
              </span>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {starters.map(s => {
                  const selected = starter === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => pickStarter(s.key)}
                      className={cn(
                        'flex flex-col text-left p-3 rounded-lg border transition-all',
                        selected
                          ? 'border-[var(--site-primary,#3b82f6)] bg-[var(--site-primary,#3b82f6)]/5 ring-1 ring-[var(--site-primary,#3b82f6)]'
                          : 'border-steel-200 dark:border-dark-300 hover:border-steel-300 dark:hover:border-dark-200 bg-white dark:bg-dark-100'
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium text-steel-900 dark:text-steel-100">
                          {s.name}
                        </span>
                        {selected && (
                          <Check className="size-4 text-[var(--site-primary,#3b82f6)] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-steel-500 dark:text-steel-400 mt-0.5 line-clamp-2">
                        {s.description}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => pickStarter('blank')}
                  className={cn(
                    'flex flex-col text-left p-3 rounded-lg border transition-all',
                    starter === 'blank'
                      ? 'border-[var(--site-primary,#3b82f6)] bg-[var(--site-primary,#3b82f6)]/5 ring-1 ring-[var(--site-primary,#3b82f6)]'
                      : 'border-steel-200 dark:border-dark-300 hover:border-steel-300 dark:hover:border-dark-200 bg-white dark:bg-dark-100'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium text-steel-900 dark:text-steel-100">
                      Blank / Minimal
                    </span>
                    {starter === 'blank' && (
                      <Check className="size-4 text-[var(--site-primary,#3b82f6)] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-steel-500 dark:text-steel-400 mt-0.5">
                    Start from an empty template and build your layout completely from scratch.
                  </p>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Creating...' : 'Create & open builder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  item,
  open,
  onOpenChange,
}: {
  item: HeaderFooterItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [isPending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      await handleActionResponse(
        renameHeaderFooter({
          id: item.id,
          name: name.trim(),
        }),
        () => {
          toast.success('Renamed successfully');
          onOpenChange(false);
          router.refresh();
        }
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Rename {noun(item.category)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              <span>Name</span>
              <FormInput
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={150}
                required
                autoFocus
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
