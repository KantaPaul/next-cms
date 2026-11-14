'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input, Textarea } from '@/components/atoms/forms';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { slugify } from '@/lib/utils/slugify';
import type { CollectionTermNode } from '@/server/services/collection-taxonomies.service';
import {
  deleteTermAction,
  saveTermAction,
} from '../_modules/collection-taxonomies.actions';
import { generateTermSuffix } from '../_modules/collections.schemas';

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
    <Label className={cn('flex flex-col gap-1 text-sm font-medium', className)}>
      {label}
      {children}
    </Label>
  );
}

export function useSlugSync(initialName: string, initialSlug: string) {
  const [name, setName] = useState(initialName);
  const [suffix] = useState(() => {
    const match = initialSlug ? initialSlug.match(/-(TC\d+)$/i) : null;
    return match ? match[1].toUpperCase() : generateTermSuffix();
  });
  const [slug, setSlug] = useState(() => {
    if (initialSlug) return initialSlug;
    const base = slugify(initialName);
    return base ? `${base}-${suffix}` : '';
  });
  return {
    name,
    slug,
    suffix,
    setName: (value: string) => {
      setName(value);
      const base = slugify(value);
      setSlug(base ? `${base}-${suffix}` : '');
    },
    setSlug,
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
  const t = useTranslations('collections.terms');
  const router = useRouter();
  const [editing, setEditing] = useState<CollectionTermNode | 'new' | null>(
    null
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  const singular = taxonomy.singularName || t('fallbackSingular');

  const handleDelete = async (term: CollectionTermNode) => {
    if (
      !confirm(
        t('confirmDelete', { singular: singular.toLowerCase(), name: term.name })
      )
    ) {
      return;
    }
    setPendingId(term.id);
    await handleActionResponse(
      deleteTermAction({ id: term.id, collectionSlug }),
      () => {
        toast.success(t('deleted', { singular: singular.toLowerCase(), name: term.name }));
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
          ? t('hierarchicalIntro')
          : t('flatIntro')
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
          <Plus /> {t('add', { name: singular.toLowerCase() })}
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
                  style={{ paddingInlineStart: term.depth * 20 }}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  {term.depth > 0 && (
                    <span aria-hidden="true" className="text-steel-300 rtl:-scale-x-100">
                      {'└'}
                    </span>
                  )}
                  <span className="truncate font-medium">{term.name}</span>
                  <span className="truncate text-xs text-steel-400">
                    /{term.slug}
                  </span>
                </span>
                <span className="rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-600 dark:bg-dark-300 dark:text-steel-300">
                  {t('count', { count: term.count })}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('edit', { name: term.name })}
                  onClick={() => setEditing(term)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('delete', { name: term.name })}
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
                    {t('count', { count: term.count })}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('edit', { name: term.name })}
                    onClick={() => setEditing(term)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('delete', { name: term.name })}
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
          {t('empty', { name: taxonomy.name.toLowerCase() })}
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
  const t = useTranslations('collections.terms');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { name, slug, suffix, setName } = useSlugSync(
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
        if (
          t.parentId &&
          descendants.has(t.parentId) &&
          !descendants.has(t.id)
        ) {
          descendants.add(t.id);
          changed = true;
        }
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t('nameRequired'));
      return;
    }
    const derivedSlug = (
      slug || (trimmedName ? `${slugify(trimmedName)}-${suffix}` : '')
    ).trim();
    if (!derivedSlug) {
      toast.error(t('slugInvalid'));
      return;
    }

    const nameClash = allTerms.some(
      t =>
        t.id !== term?.id &&
        (t.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
          t.slug.toLowerCase() === derivedSlug.toLowerCase())
    );
    if (nameClash) {
      toast.error(
        t('exists', { singular: singularName.toLowerCase() })
      );
      return;
    }

    startTransition(async () => {
      await handleActionResponse(
        saveTermAction(
          {
            id: term?.id,
            taxonomyId,
            name: trimmedName,
            slug: derivedSlug,
            parentId: hierarchical && parentId ? parentId : null,
            description: description.trim() || undefined,
          },
          collectionSlug
        ),
        () => {
          toast.success(
            term ? t('updated', { singular: singularName }) : t('created', { singular: singularName })
          );
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
      <Input
        inputClassName={inputClass}
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t('namePlaceholder', { singular: singularName.toLowerCase() })}
        required
        maxLength={100}
        label={t('name')}
        isRequired
        // autoFocus
      />

      <Input
        inputClassName={cn(
          inputClass,
          'cursor-not-allowed bg-steel-100/70 font-mono text-xs text-steel-500 dark:bg-dark-200 dark:text-steel-400'
        )}
        value={slug || (name ? `${slugify(name)}-${suffix}` : '—')}
        readOnly
        tabIndex={-1}
        placeholder={t('slugPlaceholder', { example: 'cat-one-TC123545' })}
        label={t('slug')}
      />
      {hierarchical && (
        <Field label={t('parent')} className="sm:col-span-2">
          <select
            className={inputClass}
            value={parentId}
            onChange={e => setParentId(e.target.value)}
          >
            <option value="">{t('noParent')}</option>
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
      <Field label={t('description')} className="sm:col-span-2">
        <Textarea
          className={cn(inputClass, 'h-auto py-2')}
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}{' '}
          {term
            ? t('save', { singular: singularName.toLowerCase() })
            : t('create', { singular: singularName.toLowerCase() })}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X /> {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
