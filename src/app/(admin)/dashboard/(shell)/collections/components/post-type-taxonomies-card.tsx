'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from '@/components/atoms/next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Tag, Trash2, X, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PAGES } from '@/config/pages';
import { slugify } from '@/lib/utils/slugify';
import { cn } from '@/lib/utils';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  deleteTaxonomyAction,
  saveTaxonomyAction,
} from '../_modules/collection-taxonomies.actions';
import type { collectionTaxonomies } from '@/db/schema';

type TaxonomyRow = typeof collectionTaxonomies.$inferSelect;

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

export function PostTypeTaxonomiesCard({
  collectionId,
  collectionSlug,
  taxonomies,
}: {
  collectionId: string;
  collectionSlug: string;
  taxonomies: TaxonomyRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TaxonomyRow | 'new' | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleQuickAdd = (type: 'categories' | 'tags') => {
    const targetKey = type === 'categories' ? 'category' : 'tag';
    const targetName = type === 'categories' ? 'categories' : 'tags';
    const exists = taxonomies.some(
      t =>
        t.key.toLowerCase() === targetKey ||
        t.name.trim().toLowerCase() === targetName
    );
    if (exists) {
      toast.error(
        type === 'categories'
          ? 'A Categories taxonomy already exists.'
          : 'A Tags taxonomy already exists.'
      );
      return;
    }

    startTransition(async () => {
      const payload =
        type === 'categories'
          ? {
              collectionId,
              key: 'category',
              name: 'Categories',
              singularName: 'Category',
              hierarchical: true,
            }
          : {
              collectionId,
              key: 'tag',
              name: 'Tags',
              singularName: 'Tag',
              hierarchical: false,
            };

      await handleActionResponse(saveTaxonomyAction(payload), () => {
        toast.success(
          type === 'categories' ? 'Categories taxonomy added' : 'Tags taxonomy added'
        );
        router.refresh();
      });
    });
  };

  const handleDelete = async (tax: TaxonomyRow) => {
    if (
      !confirm(
        `Delete taxonomy "${tax.name}"? All its terms and entry relations will be removed.`
      )
    ) {
      return;
    }
    setPendingId(tax.id);
    await handleActionResponse(
      deleteTaxonomyAction({ id: tax.id, collectionSlug }),
      () => {
        toast.success(`Deleted taxonomy "${tax.name}"`);
        router.refresh();
      }
    );
    setPendingId(null);
  };

  const hasCategories = taxonomies.some(
    t => t.key === 'category' || t.name.trim().toLowerCase() === 'categories'
  );
  const hasTags = taxonomies.some(
    t => t.key === 'tag' || t.name.trim().toLowerCase() === 'tags'
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Taxonomies</CardTitle>
            <CardDescription>
              Organise entries into categories, tags, or custom hierarchical and flat groupings.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {!hasCategories && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd('categories')}
                disabled={isPending}
              >
                <FolderTree className="size-3.5" /> Add Categories
              </Button>
            )}
            {!hasTags && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd('tags')}
                disabled={isPending}
              >
                <Tag className="size-3.5" /> Add Tags
              </Button>
            )}
            {!editing && (
              <Button
                type="button"
                size="sm"
                onClick={() => setEditing('new')}
              >
                <Plus className="size-3.5" /> Add taxonomy
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <TaxonomyForm
            collectionId={collectionId}
            collectionSlug={collectionSlug}
            taxonomy={editing === 'new' ? null : editing}
            existingTaxonomies={taxonomies}
            onDone={() => setEditing(null)}
          />
        )}

        {taxonomies.length > 0 ? (
          <ul className="divide-y divide-steel-100 rounded-md border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
            {taxonomies.map(tax => (
              <li
                key={tax.id}
                className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link
                        href={PAGES.DASHBOARD.COLLECTION_TAXONOMY(
                          collectionSlug,
                          tax.key
                        )}
                        className="font-semibold text-primary hover:underline"
                      >
                        {tax.name}
                      </Link>
                      <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                        {tax.hierarchical ? 'Hierarchical' : 'Flat'}
                      </span>
                    </div>
                    <span className="text-xs text-steel-500">
                      Slug: {tax.key}
                      {tax.singularName ? ` · Singular: ${tax.singularName}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={PAGES.DASHBOARD.COLLECTION_TAXONOMY(
                        collectionSlug,
                        tax.key
                      )}
                    >
                      Manage terms
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${tax.name}`}
                    onClick={() => setEditing(tax)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${tax.name}`}
                    className="text-red-600 hover:text-red-700"
                    disabled={pendingId === tax.id}
                    onClick={() => handleDelete(tax)}
                  >
                    {pendingId === tax.id ? (
                      <Loader2 className="animate-spin size-4" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-steel-200 px-3 py-6 text-center text-sm text-steel-500 dark:border-dark-300">
            No taxonomies defined yet. Use &ldquo;Add Categories&rdquo; or &ldquo;Add Tags&rdquo; to quickly set up standard classification.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TaxonomyForm({
  collectionId,
  collectionSlug,
  taxonomy,
  existingTaxonomies,
  onDone,
}: {
  collectionId: string;
  collectionSlug: string;
  taxonomy: TaxonomyRow | null;
  existingTaxonomies: TaxonomyRow[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(taxonomy?.name ?? '');
  const [key, setKey] = useState(
    taxonomy?.key ?? (taxonomy?.name ? slugify(taxonomy.name) : '')
  );
  const [singularName, setSingularName] = useState(taxonomy?.singularName ?? '');
  const [hierarchical, setHierarchical] = useState(taxonomy?.hierarchical ?? false);

  const handleNameChange = (val: string) => {
    setName(val);
    setKey(slugify(val));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Taxonomy name is required');
      return;
    }
    const derivedKey = (key || slugify(trimmedName)).trim().toLowerCase();
    if (!derivedKey) {
      toast.error('Could not generate a valid key from this name');
      return;
    }

    const clash = existingTaxonomies.some(
      t =>
        t.id !== taxonomy?.id &&
        (t.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
          t.key.toLowerCase() === derivedKey)
    );
    if (clash) {
      toast.error(`A taxonomy named "${trimmedName}" already exists for this post type.`);
      return;
    }

    startTransition(async () => {
      await handleActionResponse(
        saveTaxonomyAction({
          id: taxonomy?.id,
          collectionId,
          key: derivedKey,
          name: trimmedName,
          singularName: singularName.trim() || undefined,
          hierarchical,
        }),
        () => {
          toast.success(taxonomy ? 'Taxonomy updated' : 'Taxonomy created');
          router.refresh();
          onDone();
        }
      );
    });
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-md border border-steel-200 bg-steel-50 p-4 sm:grid-cols-2 dark:border-dark-300 dark:bg-dark-100"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name (Plural)
        <input
          className={inputClass}
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="e.g. Departments"
          required
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Singular Name
        <input
          className={inputClass}
          value={singularName}
          onChange={e => setSingularName(e.target.value)}
          placeholder="e.g. Department"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Key (auto-generated)
        <input
          className={cn(
            inputClass,
            'cursor-not-allowed bg-steel-100/70 font-mono text-xs text-steel-500 dark:bg-dark-200 dark:text-steel-400'
          )}
          value={key || (name ? slugify(name) : '—')}
          readOnly
          tabIndex={-1}
          placeholder="Auto-generated from name"
        />
      </label>

      <div className="flex items-center justify-between rounded-md border border-steel-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-200">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Hierarchical</span>
          <span className="text-xs text-steel-500">
            Allow nested parent/child terms (like categories)
          </span>
        </div>
        <Switch
          checked={hierarchical}
          onChange={setHierarchical}
          aria-label="Hierarchical taxonomy"
        />
      </div>

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin size-4" />}{' '}
          {taxonomy ? 'Save taxonomy' : 'Create taxonomy'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X className="size-4" /> Cancel
        </Button>
      </div>
    </form>
  );
}
