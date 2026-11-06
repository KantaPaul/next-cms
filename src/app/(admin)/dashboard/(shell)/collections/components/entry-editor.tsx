'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  useForm,
  FormProvider,
  Controller,
  useWatch,
  useFormContext,
} from 'react-hook-form';
import { toast } from 'sonner';
import {
  Eye,
  LayoutTemplate,
  Loader2,
  MoreVertical,
  PanelsTopLeft,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/atoms/status-badge';
import { BackButton } from '@/components/atoms/buttons/back-button';
import { MediaField } from '@/components/media/media-picker';
import {
  FieldShell,
  inputClass,
  textareaClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import { SeoPanel } from '@/app/(admin)/dashboard/(shell)/pages/_components/seo-panel';
import {
  SetTemplateDialog,
  layoutLabel,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';
import { EntryDataFields, type EntryFieldConfig } from './entry-data-fields';
import { slugify } from '@/lib/utils/slugify';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { normalizePostTypeSupports } from '@/config/post-types';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import {
  saveEntryAction,
  deleteEntryAction,
  switchEntryLayoutAction,
  setEntryTemplateAction,
} from '../_modules/collections.actions';
import { saveTermAction } from '../_modules/collection-taxonomies.actions';
import type {
  collections,
  collectionEntries,
  collectionTaxonomies,
} from '@/db/schema';
import type { CollectionTermNode } from '@/server/services/collection-taxonomies.service';

type CollectionRow = typeof collections.$inferSelect;
type EntryDetail = typeof collectionEntries.$inferSelect & {
  author?: { id: string; name: string | null; email: string | null } | null;
  template?: { id: string; name: string } | null;
  terms?: {
    termId: string;
    taxonomyId: string;
    name: string;
    slug: string;
    parentId: string | null;
    position: number;
    taxonomyKey: string;
    taxonomyName: string;
    hierarchical: boolean;
  }[];
};

type TaxonomyRow = typeof collectionTaxonomies.$inferSelect;

export type EntryEditorProps = {
  collection: CollectionRow;
  entry?: EntryDetail | null;
  fields: EntryFieldConfig[];
  taxonomies: TaxonomyRow[];
  termsByTaxonomy: Record<string, CollectionTermNode[]>;
  templates: { id: string; name: string; isDefault: boolean }[];
  currentUserName?: string | null;
};

const toDateTimeLocal = (value?: Date | string | null) =>
  value ? format(new Date(value), "yyyy-MM-dd'T'HH:mm") : '';

export function EntryEditor({
  collection,
  entry,
  fields,
  taxonomies,
  termsByTaxonomy,
  templates,
  currentUserName,
}: EntryEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const supports = normalizePostTypeSupports(collection.supports);
  const [slugTouched, setSlugTouched] = useState(!!entry?.slug);

  const initialTerms = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const tax of taxonomies) {
      map[tax.id] = [];
    }
    if (entry?.terms) {
      for (const t of entry.terms) {
        if (!map[t.taxonomyId]) map[t.taxonomyId] = [];
        map[t.taxonomyId].push(t.termId);
      }
    }
    return map;
  }, [taxonomies, entry?.terms]);

  const defaultValues = useMemo(() => {
    const base: Record<string, any> = {
      slug: entry?.slug ?? '',
      excerpt: entry?.excerpt ?? '',
      featuredImage: entry?.featuredImage ?? '',
      status: entry?.status ?? 'draft',
      visibility: entry?.visibility ?? 'public',
      scheduledAt: toDateTimeLocal(entry?.scheduledAt),
      layout: entry?.layout ?? 'template',
      templateId: entry?.templateId ?? null,
      terms: initialTerms,
      seo: {
        title: entry?.seo?.title ?? '',
        description: entry?.seo?.description ?? '',
        keywords: entry?.seo?.keywords ?? '',
        canonicalUrl: entry?.seo?.canonicalUrl ?? '',
        ogTitle: entry?.seo?.ogTitle ?? '',
        ogDescription: entry?.seo?.ogDescription ?? '',
        ogImage: entry?.seo?.ogImage ?? '',
        ogType: entry?.seo?.ogType ?? 'article',
        twitterCard: entry?.seo?.twitterCard ?? 'summary_large_image',
        noIndex: entry?.seo?.noIndex ?? false,
        structuredDataType: entry?.seo?.structuredDataType ?? 'WebPage',
      },
    };

    const entryData = (entry?.data as Record<string, unknown>) ?? {};
    for (const field of fields) {
      base[`data-${field.key}`] =
        entryData[field.key] ?? (field.type === 'boolean' ? false : '');
    }

    return base;
  }, [entry, fields, initialTerms]);

  const methods = useForm({
    defaultValues,
  });

  const { register, control, setValue, handleSubmit, getValues } = methods;
  const currentStatus = useWatch({ control, name: 'status' });
  const excerptValue = useWatch({ control, name: 'excerpt' });

  const onSubmit = (values: Record<string, any>) => {
    startTransition(async () => {
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith('data-')) {
          data[k.slice(5)] = v;
        }
      }

      let slug = values.slug ? String(values.slug).trim() : '';
      if (!slug) {
        const candidate =
          data.title ||
          data.name ||
          data.label ||
          Object.values(data).find(
            v => typeof v === 'string' && v.trim().length > 0
          );
        slug = candidate
          ? slugify(String(candidate))
          : `entry-${Date.now().toString(36)}`;
      }

      const payload = {
        id: entry?.id,
        collectionId: collection.id,
        slug,
        status: values.status,
        visibility: values.visibility,
        scheduledAt: values.scheduledAt || null,
        excerpt: values.excerpt || null,
        featuredImage: values.featuredImage || null,
        layout: values.layout,
        templateId: values.templateId || null,
        data,
        terms: values.terms ?? {},
        seo: values.seo,
      };

      await handleActionResponse(saveEntryAction(payload), result => {
        toast.success(
          entry
            ? `${collection.singularName || 'Entry'} updated`
            : `${collection.singularName || 'Entry'} created`
        );
        if (!entry && result && typeof result === 'object' && 'id' in result) {
          router.push(
            PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(
              collection.slug,
              (result as any).id
            )
          );
        } else {
          router.refresh();
        }
      });
    });
  };

  const submitWithStatus = (nextStatus: 'published' | 'review') => {
    setValue('status', nextStatus, { shouldDirty: true });
    handleSubmit(onSubmit)();
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (
      !confirm(
        `Delete this ${collection.singularName?.toLowerCase() || 'entry'}? This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await handleActionResponse(
        deleteEntryAction({ id: entry.id, collectionSlug: collection.slug }),
        () => {
          toast.success(`${collection.singularName || 'Entry'} deleted`);
          router.push(PAGES.DASHBOARD.COLLECTION(collection.slug));
        }
      );
    });
  };

  const handleFieldChange = (key: string, value: unknown) => {
    if (!slugTouched && !entry) {
      const isTitleLike =
        key === 'title' || key === 'name' || key === fields[0]?.key;
      if (isTitleLike && typeof value === 'string' && value.trim()) {
        setValue('slug', slugify(value), { shouldDirty: true });
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col gap-0"
      >
        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-steel-200 bg-white px-4 py-3 dark:border-dark-300 dark:bg-dark-50">
          <BackButton disabled={isPending} />
          {entry && (
            <StatusBadge
              status={entry.status}
              statusColor={
                PAGE_STATUS_COLORS[
                  entry.status as keyof typeof PAGE_STATUS_COLORS
                ] ?? 'draft'
              }
            />
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {entry && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`/${collection.slug}/${entry.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye className="size-4" /> Preview
                </a>
              </Button>
            )}

            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>

            {canPublish ? (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => submitWithStatus('published')}
              >
                {entry?.status === 'published'
                  ? `Update live ${collection.singularName?.toLowerCase() || 'entry'}`
                  : 'Publish'}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => submitWithStatus('review')}
              >
                Submit for review
              </Button>
            )}

            {entry && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="More options"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 size-4" /> Delete{' '}
                    {collection.singularName?.toLowerCase() || 'entry'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
          {/* Main Column */}
          <div className="flex-1 lg:overflow-auto">
            <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-12">
              <div className="space-y-6">
                <EntryDataFields
                  fields={fields}
                  onFieldChange={handleFieldChange}
                />

                {(supports.excerpt || supports.featuredImage) && (
                  <div
                    className={
                      supports.featuredImage && supports.excerpt
                        ? 'mt-6 grid gap-4 md:grid-cols-[1fr_16rem]'
                        : 'mt-6'
                    }
                  >
                    {supports.excerpt && (
                      <FieldShell
                        htmlFor="entry-excerpt"
                        label={
                          <>
                            Excerpt{' '}
                            <span className="text-xs font-normal text-steel-400">
                              {excerptValue?.length ?? 0}/300
                            </span>
                          </>
                        }
                        hint="Brief summary shown in listings and previews."
                      >
                        <textarea
                          id="entry-excerpt"
                          rows={4}
                          className={textareaClass}
                          {...register('excerpt')}
                        />
                      </FieldShell>
                    )}

                    {supports.featuredImage && (
                      <Controller
                        control={control}
                        name="featuredImage"
                        render={({ field }) => (
                          <FieldShell label="Featured image">
                            <MediaField
                              value={field.value ?? ''}
                              onChange={field.onChange}
                            />
                          </FieldShell>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full border-t border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50 lg:w-96 lg:overflow-auto lg:border-l lg:border-t-0">
            <Tabs defaultValue="entry" className="gap-0">
              <TabsList
                className={`m-3 grid ${supports.seo ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                <TabsTrigger value="entry">
                  {collection.singularName || 'Entry'}
                </TabsTrigger>
                {supports.seo && <TabsTrigger value="seo">SEO</TabsTrigger>}
              </TabsList>

              <TabsContent value="entry" className="space-y-6 pb-6">
                {/* Layout Section */}
                {supports.template && entry && (
                  <LayoutSection
                    entry={entry}
                    collection={collection}
                    templates={templates}
                  />
                )}

                {/* Status, Visibility, Slug, Publish-at, Author */}
                <div className="space-y-4 px-4">
                  {supports.status && (
                    <>
                      <FieldShell label="Status" htmlFor="entry-status">
                        <select
                          id="entry-status"
                          className={inputClass}
                          {...register('status')}
                        >
                          <option value="draft">Draft</option>
                          <option value="review">Under review</option>
                          <option value="scheduled">Scheduled</option>
                          {canPublish && (
                            <option value="published">Published</option>
                          )}
                        </select>
                      </FieldShell>

                      <FieldShell label="Visibility" htmlFor="entry-visibility">
                        <select
                          id="entry-visibility"
                          className={inputClass}
                          {...register('visibility')}
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </FieldShell>

                      {currentStatus === 'scheduled' && (
                        <FieldShell
                          label="Publish at"
                          htmlFor="entry-scheduled-at"
                          hint="The entry goes live automatically at this time."
                        >
                          <input
                            id="entry-scheduled-at"
                            type="datetime-local"
                            className={inputClass}
                            {...register('scheduledAt')}
                          />
                        </FieldShell>
                      )}
                    </>
                  )}

                  <FieldShell label="Slug" htmlFor="entry-slug">
                    <input
                      id="entry-slug"
                      className={inputClass}
                      placeholder="entry-slug"
                      {...register('slug', {
                        onChange: () => setSlugTouched(true),
                      })}
                    />
                  </FieldShell>

                  {supports.author && (
                    <FieldShell label="Author">
                      <input
                        className={`${inputClass} bg-steel-50 text-steel-500 dark:bg-dark-100 dark:text-steel-400`}
                        value={
                          entry?.author?.name ||
                          entry?.author?.email ||
                          currentUserName ||
                          'Current user'
                        }
                        readOnly
                        disabled
                      />
                    </FieldShell>
                  )}
                </div>

                {/* Taxonomies Section */}
                {supports.taxonomies && taxonomies.length > 0 && (
                  <div className="space-y-5 border-t border-steel-200 px-4 pt-5 dark:border-dark-300">
                    <h3 className="text-sm font-semibold text-steel-900 dark:text-steel-100">
                      Taxonomies
                    </h3>
                    {taxonomies.map(tax => (
                      <TaxonomyBlock
                        key={tax.id}
                        taxonomy={tax}
                        terms={termsByTaxonomy[tax.id] ?? []}
                        collectionSlug={collection.slug}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {supports.seo && (
                <TabsContent value="seo">
                  <SeoPanel
                    kind="entry"
                    pathPrefix={`${collection.slug}/`}
                  />
                </TabsContent>
              )}
            </Tabs>
          </aside>
        </div>
      </form>
    </FormProvider>
  );
}

function LayoutSection({
  entry,
  collection,
  templates,
}: {
  entry: EntryDetail;
  collection: CollectionRow;
  templates: { id: string; name: string; isDefault: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const canManageTemplates = useCan(PERMISSIONS.PAGES_PUBLISH);
  const isCustom = entry.layout === 'custom';
  const templateId =
    entry.templateId ?? templates.find(t => t.isDefault)?.id ?? null;
  const Icon = isCustom ? PanelsTopLeft : LayoutTemplate;

  const target = {
    id: entry.id,
    title: entry.slug,
    layout: entry.layout as 'template' | 'custom',
    templateId: entry.templateId,
    templateName: entry.template?.name,
  };

  return (
    <div className="px-4 pt-1">
      <p className="mb-2 text-sm font-medium text-steel-700 dark:text-steel-200">
        Layout
      </p>
      <div className="flex items-start gap-3 rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <Icon className="mt-0.5 size-4 shrink-0 text-indigo-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {layoutLabel(target, templates)}
          </span>
          <span className="block text-xs text-steel-500">
            {isCustom
              ? 'This entry has its own canvas.'
              : entry.templateId
                ? 'Renders through this template.'
                : 'Follows the default template.'}
          </span>
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Set template
        </Button>
        {isCustom ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={PAGES.DASHBOARD.COLLECTION_ENTRY_BUILDER(
                collection.slug,
                entry.id
              )}
            >
              Open layout builder
            </Link>
          </Button>
        ) : (
          canManageTemplates &&
          templateId && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link
                href={PAGES.DASHBOARD.COLLECTION_TEMPLATE_BUILDER(
                  collection.slug,
                  templateId
                )}
              >
                Edit template
              </Link>
            </Button>
          )
        )}
      </div>

      <SetTemplateDialog
        key={`${entry.layout}-${entry.templateId}`}
        post={target}
        templates={templates}
        open={open}
        onOpenChange={setOpen}
        title="Set entry template"
        onSwitchLayout={layout =>
          switchEntryLayoutAction({ id: entry.id, layout })
        }
        onSetTemplate={templateId =>
          setEntryTemplateAction({ id: entry.id, templateId })
        }
      />
    </div>
  );
}

function TaxonomyBlock({
  taxonomy,
  terms,
  collectionSlug,
}: {
  taxonomy: TaxonomyRow;
  terms: CollectionTermNode[];
  collectionSlug: string;
}) {
  const router = useRouter();
  const { control, setValue } = useFormContext();
  const allTerms = useWatch({ control, name: 'terms' }) as
    | Record<string, string[]>
    | undefined;
  const selectedTerms: string[] = allTerms?.[taxonomy.id] ?? [];
  const [adding, setAdding] = useState(false);
  const [termName, setTermName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isAddingPending, startAddTransition] = useTransition();

  const toggleTerm = (termId: string, checked: boolean) => {
    const next = checked
      ? [...selectedTerms, termId]
      : selectedTerms.filter(id => id !== termId);
    setValue(`terms.${taxonomy.id}`, next, { shouldDirty: true });
  };

  const handleCreateTerm = () => {
    if (!termName.trim()) return;
    startAddTransition(async () => {
      const slug = slugify(termName);
      await handleActionResponse(
        saveTermAction(
          {
            taxonomyId: taxonomy.id,
            name: termName.trim(),
            slug,
            parentId: parentId || undefined,
          },
          collectionSlug
        ),
        result => {
          toast.success(
            `Added ${taxonomy.singularName || 'term'} "${termName.trim()}"`
          );
          if (result && typeof result === 'object' && 'id' in result) {
            setValue(
              `terms.${taxonomy.id}`,
              [...selectedTerms, (result as any).id],
              { shouldDirty: true }
            );
          }
          setTermName('');
          setParentId('');
          setAdding(false);
          router.refresh();
        }
      );
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-steel-600 dark:text-steel-400">
          {taxonomy.name}
        </label>
        <Link
          href={PAGES.DASHBOARD.COLLECTION_TAXONOMY(
            collectionSlug,
            taxonomy.key
          )}
          className="text-xs text-primary hover:underline"
        >
          Manage
        </Link>
      </div>

      {terms.length > 0 ? (
        <div className="max-h-48 overflow-y-auto rounded-md border border-steel-200 bg-white p-2.5 dark:border-dark-300 dark:bg-dark-100">
          <div className="space-y-1.5">
            {terms.map(term => {
              const checked = selectedTerms.includes(term.id);
              return (
                <label
                  key={term.id}
                  className="flex items-center gap-2 text-xs hover:bg-steel-50 dark:hover:bg-dark-200 py-0.5 rounded px-1 cursor-pointer"
                  style={{
                    paddingLeft: `${Math.max(0.25, (term.depth ?? 0) * 1.25 + 0.25)}rem`,
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={val => toggleTerm(term.id, val === true)}
                  />
                  <span className="truncate">{term.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-steel-400">
          No {taxonomy.name.toLowerCase()} yet.
        </p>
      )}

      {adding ? (
        <div className="space-y-2 rounded-md border border-steel-200 bg-steel-50 p-2.5 dark:border-dark-300 dark:bg-dark-100">
          <input
            className={inputClass}
            placeholder={`New ${taxonomy.singularName || 'term'} name`}
            value={termName}
            onChange={e => setTermName(e.target.value)}
            autoFocus
          />
          {taxonomy.hierarchical && terms.length > 0 && (
            <select
              className={inputClass}
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">No parent (top level)</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {`${'— '.repeat(t.depth ?? 0)}${t.name}`}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isAddingPending || !termName.trim()}
              onClick={handleCreateTerm}
            >
              {isAddingPending && <Loader2 className="animate-spin size-3 mr-1" />}
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setTermName('');
                setParentId('');
              }}
            >
              <X className="size-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3 mr-1" /> Add{' '}
          {taxonomy.singularName?.toLowerCase() || 'term'}
        </Button>
      )}
    </div>
  );
}
