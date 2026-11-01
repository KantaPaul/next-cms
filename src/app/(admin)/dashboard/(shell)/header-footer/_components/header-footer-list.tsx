'use client';

import { format } from 'date-fns';
import { Check, Copy, Edit3, Globe, LayoutTemplate, MoreHorizontal, PanelBottom, PanelTop, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import {
  HEADER_STARTERS,
  FOOTER_STARTERS,
} from '@/db/seed/header-footer-starters';
import {
  ActionDropdown,
  ActionDropdownItem,
} from '@/components/atoms/action-dropdown';
import {
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from '@/components/atoms/table';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { HeaderFooterItem } from '../_modules/header-footer.service';
import {
  createHeaderFooter,
  deleteHeaderFooter,
  duplicateHeaderFooter,
  renameHeaderFooter,
} from '../_modules/header-footer.actions';

export function HeaderFooterList({
  items,
  can,
}: {
  items: HeaderFooterItem[];
  can: { create: boolean; delete: boolean };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Header' | 'Footer'>('Header');
  const [renaming, setRenaming] = useState<HeaderFooterItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const headers = items.filter(i => i.category === 'Header');
  const footers = items.filter(i => i.category === 'Footer');

  const currentList = activeTab === 'Header' ? headers : footers;

  const remove = async (item: HeaderFooterItem) => {
    let warning = `Delete the "${item.name}" ${item.category.toLowerCase()}?`;
    if (item.isSiteDefault) {
      warning = `"${item.name}" is currently set as the site default ${item.category.toLowerCase()}! Deleting it will fall back to the built-in layout. Delete anyway?`;
    } else if (item.pageCount > 0) {
      warning = `"${item.name}" is used on ${item.pageCount} page${item.pageCount > 1 ? 's' : ''}. Delete anyway?`;
    }
    if (!confirm(warning)) return;

    setPendingId(item.id);
    await handleActionResponse(deleteHeaderFooter({ id: item.id }), () => {
      toast.success(`${item.category} deleted`);
      router.refresh();
    });
    setPendingId(null);
  };

  const duplicate = async (item: HeaderFooterItem) => {
    setPendingId(item.id);
    await handleActionResponse(duplicateHeaderFooter({ id: item.id }), () => {
      toast.success(`${item.category} duplicated`);
      router.refresh();
    });
    setPendingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel-500">
          Design visual header and footer layouts with dedicated blocks. Assign them as site defaults, locale overrides, or on specific pages.
        </p>
        {can.create && (
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 size-4" />
            New {activeTab.toLowerCase()}
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as 'Header' | 'Footer')}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="Header" className="flex items-center gap-2">
            <PanelTop className="size-4" />
            Headers ({headers.length})
          </TabsTrigger>
          <TabsTrigger value="Footer" className="flex items-center gap-2">
            <PanelBottom className="size-4" />
            Footers ({footers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {!currentList.length ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-steel-200 px-6 py-12 text-center dark:border-dark-300">
              <LayoutTemplate className="size-8 text-steel-300" />
              <p className="font-medium">No {activeTab.toLowerCase()}s yet</p>
              <p className="max-w-md text-sm text-steel-500">
                Create a {activeTab.toLowerCase()} here, customize it in the visual builder, then assign it in Settings or on individual pages.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-steel-200 dark:border-dark-300">
              <TableContainer>
                <TableRoot>
                  <TableHead>
                    <TableRow hoverStyle={false}>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Assigned as</TableHeaderCell>
                      <TableHeaderCell>Updated</TableHeaderCell>
                      <TableHeaderCell>Author</TableHeaderCell>
                      <TableHeaderCell className="w-12 text-right">
                        Actions
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentList.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={PAGES.DASHBOARD.HEADER_FOOTER_EDIT(item.id)}
                              className="font-medium hover:underline"
                            >
                              {item.name}
                            </Link>
                            {!item.isPublished ? (
                              <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[10px] font-medium text-steel-600 dark:bg-dark-200 dark:text-steel-400">
                                Draft
                              </span>
                            ) : item.hasDraftChanges ? (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                Draft changes
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                Published
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
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
                            {!item.isSiteDefault &&
                              !item.locales.length &&
                              item.pageCount === 0 && (
                                <span className="text-steel-400">—</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.updatedAt
                            ? format(new Date(item.updatedAt), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.createdByName ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <ActionDropdown
                            isLoading={pendingId === item.id}
                            variant="vertical"
                          >
                            <ActionDropdownItem
                              href={PAGES.DASHBOARD.HEADER_FOOTER_EDIT(item.id)}
                              label="Edit in builder"
                            />
                            <ActionDropdownItem
                              label="Duplicate"
                              onClick={() => duplicate(item)}
                            />
                            <ActionDropdownItem
                              label="Rename"
                              onClick={() => setRenaming(item)}
                            />
                            {can.delete && (
                              <ActionDropdownItem
                                label="Delete"
                                className="text-red-600 dark:text-red-400"
                                onClick={() => remove(item)}
                              />
                            )}
                          </ActionDropdown>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </TableContainer>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewHeaderFooterDialog
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
  category: 'Header' | 'Footer';
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [starter, setStarter] = useState<string>(
    category === 'Header' ? 'classic' : 'columns-4'
  );
  const [isPending, startTransition] = useTransition();

  const starters = category === 'Header' ? HEADER_STARTERS : FOOTER_STARTERS;

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
          toast.success(`${category} created`);
          onOpenChange(false);
          setName('');
          router.push(PAGES.DASHBOARD.HEADER_FOOTER_EDIT(row.id));
        }
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New {category}</DialogTitle>
            <DialogDescription>
              Create a new {category.toLowerCase()} layout with dedicated builder blocks or choose a starter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              <span>Name</span>
              <FormInput
                placeholder={`e.g. Main ${category}, Landing ${category}`}
                value={name}
                onChange={e => setName(e.target.value)}
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
                      onClick={() => {
                        setStarter(s.key);
                        if (!name.trim()) setName(s.name);
                      }}
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
                  onClick={() => setStarter('blank')}
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
            <DialogTitle>Rename {item.category}</DialogTitle>
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
