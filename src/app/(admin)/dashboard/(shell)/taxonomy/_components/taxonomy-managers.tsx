'use client';

import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { slugify } from '@/lib/utils/slugify';
import { cn } from '@/lib/utils/cn';
import { deleteCategory, deleteTag, saveCategory, saveTag } from '../_modules/taxonomy.actions';
import type { CategoryNode } from '../_modules/taxonomy.service';

type Tag = { id: string; name: string; slug: string; color: string; count: number };

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
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

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm font-medium', className)}>
      {label}
      {children}
    </label>
  );
}

/** Slug follows the name until the user edits the slug directly. */
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

function useConfirmDelete() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const run = async (id: string, label: string, action: () => Promise<unknown>) => {
    if (!confirm(`Delete ${label}? Pages keep their content; the assignment is removed.`)) return;
    setPendingId(id);
    await handleActionResponse(action(), () => {
      toast.success(`Deleted ${label}`);
      router.refresh();
    });
    setPendingId(null);
  };

  return { pendingId, run };
}

export function CategoriesManager({ categories }: { categories: CategoryNode[] }) {
  const [editing, setEditing] = useState<CategoryNode | 'new' | null>(null);
  const { pendingId, run } = useConfirmDelete();

  return (
    <Panel title="Categories" description="Nested groups for pages. Child categories inherit their parent's place in the hierarchy.">
      {editing ? (
        <CategoryForm
          key={editing === 'new' ? 'new' : editing.id}
          category={editing === 'new' ? null : editing}
          categories={categories}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Button type="button" size="sm" className="self-start" onClick={() => setEditing('new')}>
          <Plus /> Add category
        </Button>
      )}

      {categories.length ? (
        <ul className="divide-y divide-steel-100 rounded-md border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {categories.map(category => (
            <li key={category.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span style={{ paddingLeft: category.depth * 20 }} className="flex min-w-0 flex-1 items-center gap-2">
                {category.depth > 0 && <span className="text-steel-300">└</span>}
                <span className="truncate font-medium">{category.name}</span>
                <span className="truncate text-xs text-steel-400">/{category.slug}</span>
              </span>
              <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                {category.count} {category.count === 1 ? 'page' : 'pages'}
              </span>
              <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category)}>
                <Pencil />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Delete ${category.name}`}
                className="text-red-600 hover:text-red-700"
                disabled={pendingId === category.id}
                onClick={() => run(category.id, `category "${category.name}"`, () => deleteCategory({ id: category.id }))}
              >
                {pendingId === category.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-steel-200 px-3 py-6 text-center text-sm text-steel-500 dark:border-dark-300">
          No categories yet.
        </p>
      )}
    </Panel>
  );
}

function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category: CategoryNode | null;
  categories: CategoryNode[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { name, slug, setName, setSlug } = useSlugSync(category?.name ?? '', category?.slug ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [description, setDescription] = useState(category?.description ?? '');

  const descendants = new Set<string>();

  if (category) {
    descendants.add(category.id);
    let changed = true;

    while (changed) {
      changed = false;

      for (const c of categories) {
        if (c.parentId && descendants.has(c.parentId) && !descendants.has(c.id)) {
          descendants.add(c.id);
          changed = true;
        }
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(
        saveCategory({ id: category?.id, name, slug, parentId: parentId || null, description }),
        () => {
          toast.success(category ? 'Category updated' : 'Category created');
          router.refresh();
          onDone();
        }
      );
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-md bg-steel-50 p-4 sm:grid-cols-2 dark:bg-dark-100">
      <Field label="Name">
        <input className={inputClass} value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoFocus />
      </Field>
      <Field label="Slug">
        <input className={inputClass} value={slug} onChange={e => setSlug(e.target.value)} required maxLength={150} />
      </Field>
      <Field label="Parent" className="sm:col-span-2">
        <select className={inputClass} value={parentId} onChange={e => setParentId(e.target.value)}>
          <option value="">None (top level)</option>
          {categories
            .filter(c => !descendants.has(c.id))
            .map(c => (
              <option key={c.id} value={c.id}>
                {'— '.repeat(c.depth)}
                {c.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <textarea className={cn(inputClass, 'h-auto py-2')} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />} {category ? 'Save category' : 'Create category'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X /> Cancel
        </Button>
      </div>
    </form>
  );
}

export function TagsManager({ tags }: { tags: Tag[] }) {
  const [editing, setEditing] = useState<Tag | 'new' | null>(null);
  const { pendingId, run } = useConfirmDelete();

  return (
    <Panel title="Tags" description="Flat labels for cross-cutting topics. The colour shows on tag chips across the dashboard.">
      {editing ? (
        <TagForm key={editing === 'new' ? 'new' : editing.id} tag={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <Button type="button" size="sm" className="self-start" onClick={() => setEditing('new')}>
          <Plus /> Add tag
        </Button>
      )}

      {tags.length ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <li
              key={tag.id}
              className="group flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-sm"
              style={{ borderColor: `${tag.color}66`, backgroundColor: `${tag.color}14` }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="font-medium">{tag.name}</span>
              <span className="text-xs text-steel-500">{tag.count}</span>
              <button
                type="button"
                aria-label={`Edit ${tag.name}`}
                onClick={() => setEditing(tag)}
                className="rounded-full p-1 text-steel-500 hover:bg-black/5 hover:text-steel-800 dark:hover:bg-white/10"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${tag.name}`}
                disabled={pendingId === tag.id}
                onClick={() => run(tag.id, `tag "${tag.name}"`, () => deleteTag({ id: tag.id }))}
                className="rounded-full p-1 text-steel-500 hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10"
              >
                {pendingId === tag.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-steel-200 px-3 py-6 text-center text-sm text-steel-500 dark:border-dark-300">
          No tags yet.
        </p>
      )}
    </Panel>
  );
}

function TagForm({ tag, onDone }: { tag: Tag | null; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { name, slug, setName, setSlug } = useSlugSync(tag?.name ?? '', tag?.slug ?? '');
  const [color, setColor] = useState(tag?.color ?? '#6366f1');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(saveTag({ id: tag?.id, name, slug, color }), () => {
        toast.success(tag ? 'Tag updated' : 'Tag created');
        router.refresh();
        onDone();
      });
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-md bg-steel-50 p-4 sm:grid-cols-[1fr_1fr_auto] dark:bg-dark-100">
      <Field label="Name">
        <input className={inputClass} value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoFocus />
      </Field>
      <Field label="Slug">
        <input className={inputClass} value={slug} onChange={e => setSlug(e.target.value)} required maxLength={150} />
      </Field>
      <Field label="Colour">
        <input
          type="color"
          className="h-9 w-16 cursor-pointer rounded-md border border-steel-200 bg-white p-1 dark:border-dark-300 dark:bg-dark-100"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />} {tag ? 'Save tag' : 'Create tag'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X /> Cancel
        </Button>
      </div>
    </form>
  );
}
