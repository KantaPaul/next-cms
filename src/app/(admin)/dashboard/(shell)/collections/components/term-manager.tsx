'use client';

import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { slugify } from '@/lib/utils/slugify';
import {
  deleteTermAction,
  saveTermAction,
} from '../_modules/collection-taxonomies.actions';
import type { CollectionTermNode } from '@/server/services/collection-taxonomies.service';

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-steel-200 p-5 dark:border-dark-300">
      <header>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-steel-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm font-medium', className)}>
      {label}
      {children}
    </label>
  );
}

function useSlugSync(initialName: string, initialSlug: string) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugTouched, setSlugTouched] = useState(!!initialSlug);
  return {
    name,
    slug,
    setName: (value: string) => {
      setName(value);
      if (!slugTouched) setSlug(slugify(value));
    },
    setSlug: (value: string) => {
      setSlugTouched(true);
      setSlug(value);
    },
  };
}

export function TermManager({
  collectionSlug,
  taxonomy,
  terms,
}: {
  collectionSlug: string;
  taxonomy: {
    id: string;
    key: string;
    name: string;
    singularName?: string | null;
    hierarchical: boolean;
  };
  terms: CollectionTermNode[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CollectionTermNode | 'new' | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const singular = taxonomy.singularName || 'Term';

  const handleDelete = async (term: CollectionTermNode) => {
    if (
      !confirm(
        `Delete ${singular.toLowerCase()} "${term.name}"? Entries keep their content; the assignment is removed.`
      )
    ) {
      return;
    }
    setPendingId(term.id);
    await handleActionResponse(
      deleteTermAction({ id: term.id, collectionSlug }),
      () => {
        toast.success(`Deleted ${singular.toLowerCase()} "${term.name}"`);
        router.refresh();
      }
    );
    setPendingId(null);
  };

  return (
    <Panel
      title={taxonomy.name}
      description={
        taxonomy.hierarchical
          ? `Hierarchical taxonomy for this post type. Child terms inherit their parent's place in the tree.`
          : `Flat tags for this post type.`
      }
    >
      {editing ? (
        <TermForm
          key={editing === 'new' ? 'new' : editing.id}
          taxonomyId={taxonomy.id}
          collectionSlug={collectionSlug}
          singularName={singular}
          hierarchical={taxonomy.hierarchical}
          term={editing === 'new' ? null : editing}
          allTerms={terms}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          className="self-start"
          onClick={() => setEditing('new')}
        >
          <Plus /> Add {singular.toLowerCase()}
        </Button>
      )}

      {terms.length ? (
        taxonomy.hierarchical ? (
          // Hierarchical tree list
          <ul className="divide-y divide-steel-100 rounded-md border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
            {terms.map(term => (
              <li
                key={term.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <span
                  style={{ paddingLeft: term.depth * 20 }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  {term.depth > 0 && (
                    <span className="text-steel-300">└</span>
                  )}
                  <span className="truncate font-medium">{term.name}</span>
                  <span className="truncate text-xs text-steel-400">
                    /{term.slug}
                  </span>
                </span>
                <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                  {term.count} {term.count === 1 ? 'entry' : 'entries'}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit ${term.name}`}
                  onClick={() => setEditing(term)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${term.name}`}
                  className="text-red-600 hover:text-red-700"
                  disabled={pendingId === term.id}
                  onClick={() => handleDelete(term)}
                >
                  {pendingId === term.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          // Flat tag-style list
          <ul className="divide-y divide-steel-100 rounded-md border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
            {terms.map(term => (
              <li
                key={term.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{term.name}</span>
                  <span className="truncate text-xs text-steel-400">
                    /{term.slug}
                  </span>
                  {term.description && (
                    <span className="hidden truncate text-xs text-steel-500 sm:inline">
                      — {term.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                    {term.count} {term.count === 1 ? 'entry' : 'entries'}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${term.name}`}
                    onClick={() => setEditing(term)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${term.name}`}
                    className="text-red-600 hover:text-red-700"
                    disabled={pendingId === term.id}
                    onClick={() => handleDelete(term)}
                  >
                    {pendingId === term.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="rounded-md border border-dashed border-steel-200 px-3 py-6 text-center text-sm text-steel-500 dark:border-dark-300">
          No {taxonomy.name.toLowerCase()} yet.
        </p>
      )}
    </Panel>
  );
}

function TermForm({
  taxonomyId,
  collectionSlug,
  singularName,
  hierarchical,
  term,
  allTerms,
  onDone,
}: {
  taxonomyId: string;
  collectionSlug: string;
  singularName: string;
  hierarchical: boolean;
  term: CollectionTermNode | null;
  allTerms: CollectionTermNode[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { name, slug, setName, setSlug } = useSlugSync(
    term?.name ?? '',
    term?.slug ?? ''
  );
  const [parentId, setParentId] = useState(term?.parentId ?? '');
  const [description, setDescription] = useState(term?.description ?? '');

  // Cycle guard: exclude self and any descendants from parent selection
  const descendants = new Set<string>();
  if (term) {
    descendants.add(term.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of allTerms) {
        if (t.parentId && descendants.has(t.parentId) && !descendants.has(t.id)) {
          descendants.add(t.id);
          changed = true;
        }
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(
        saveTermAction(
          {
            id: term?.id,
            taxonomyId,
            name,
            slug,
            parentId: hierarchical && parentId ? parentId : null,
            description: description.trim() || undefined,
          },
          collectionSlug
        ),
        () => {
          toast.success(term ? `${singularName} updated` : `${singularName} created`);
          router.refresh();
          onDone();
        }
      );
    });
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-md bg-steel-50 p-4 sm:grid-cols-2 dark:bg-dark-100"
    >
      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={100}
          autoFocus
        />
      </Field>
      <Field label="Slug">
        <input
          className={inputClass}
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
          maxLength={150}
        />
      </Field>
      {hierarchical && (
        <Field label="Parent" className="sm:col-span-2">
          <select
            className={inputClass}
            value={parentId}
            onChange={e => setParentId(e.target.value)}
          >
            <option value="">None (top level)</option>
            {allTerms
              .filter(t => !descendants.has(t.id))
              .map(t => (
                <option key={t.id} value={t.id}>
                  {'— '.repeat(t.depth)}
                  {t.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="Description" className="sm:col-span-2">
        <textarea
          className={cn(inputClass, 'h-auto py-2')}
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}{' '}
          {term ? `Save ${singularName.toLowerCase()}` : `Create ${singularName.toLowerCase()}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X /> Cancel
        </Button>
      </div>
    </form>
  );
}
