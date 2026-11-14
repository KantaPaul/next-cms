'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { format } from 'date-fns';
import {
  Controller,
  useForm,
  FormProvider,
  useWatch,
  useFormContext,
} from 'react-hook-form';
import { toast } from 'sonner';
import {
  Eye,
  LayoutTemplate,
  MoreVertical,
  PanelsTopLeft,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ReactSelect,
  groupSelectedOptions,
  handleMultiSelect,
  handleOnChange,
  type Option,
} from '@/components/atoms/react-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/atoms/status-badge';
import { Switch } from '@/components/ui/switch';
import { BackButton } from '@/components/atoms/buttons/back-button';
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
  useLayoutLabel,
} from '@/app/(admin)/dashboard/(shell)/posts/_components/set-template-dialog';
import { useStatusLabel } from '@/i18n/use-content-labels';
import { EntryDataFields, type EntryFieldConfig } from './entry-data-fields';
import {
  EntryLanguageSection,
  type EntryTranslationRow,
} from './entry-translations';
import { useSiteLocales } from '@/providers/site-locales';
import { slugify } from '@/lib/utils/slugify';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  entryMediaValues,
  normalizePostTypeSupports,
} from '@/config/post-types';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { useCan } from '@/providers/access.provider';
import {
  saveEntryAction,
  deleteEntryAction,
  switchEntryLayoutAction,
  setEntryTemplateAction,
} from '../_modules/collections.actions';
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
  /** Other language versions of this entry. */
  translations?: EntryTranslationRow[];
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
  translations = [],
}: EntryEditorProps) {
  const router = useRouter();
  const { currentLocale } = useSiteLocales();
  // New entries start in the dashboard's working language.
  const [newLanguage, setNewLanguage] = useState(currentLocale);
  const [isPending, startTransition] = useTransition();
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const supports = normalizePostTypeSupports(collection.supports);
  const [slugTouched, setSlugTouched] = useState(!!entry?.slug);
  const t = useTranslations('collections.entries');
  const tContent = useTranslations('content');
  const tStatus = useTranslations('common.statuses');
  const tVisibility = useTranslations('common.visibilities');
  const statusLabel = useStatusLabel();
  const singular = collection.singularName || t('fallbackSingular');
  const singularLower = singular.toLowerCase();

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
      status: entry?.status ?? 'draft',
      visibility: entry?.visibility ?? 'public',
      scheduledAt: toDateTimeLocal(entry?.scheduledAt),
      layout: entry?.layout ?? 'template',
      templateId: entry?.templateId ?? null,
      allowComments: entry?.allowComments ?? true,
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
      const raw = entryData[field.key];
      if (field.type === 'media') {
        base[`data-${field.key}`] = field.multiple
          ? entryMediaValues(raw)
          : (entryMediaValues(raw)[0] ?? '');
      } else {
        base[`data-${field.key}`] =
          raw ?? (field.type === 'boolean' ? false : '');
      }
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
        layout: values.layout,
        templateId: values.templateId || null,
        ...(entry ? {} : { language: newLanguage }),
        data,
        terms: values.terms ?? {},
        allowComments: values.allowComments,
        seo: values.seo,
      };

      await handleActionResponse(saveEntryAction(payload), result => {
        toast.success(
          entry
            ? t('updated', { singular })
            : t('created', { singular })
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
        t('confirmDeleteThis', { singular: singularLower })
      )
    ) {
      return;
    }
    startTransition(async () => {
      await handleActionResponse(
        deleteEntryAction({ id: entry.id, collectionSlug: collection.slug }),
        () => {
          toast.success(t('deleted', { singular }));
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
              label={statusLabel(entry.status)}
              statusColor={
                PAGE_STATUS_COLORS[
                  entry.status as keyof typeof PAGE_STATUS_COLORS
                ] ?? 'draft'
              }
            />
          )}

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {entry && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`/${collection.slug}/${entry.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye className="size-4" /> {tContent('toolbar.preview')}
                </a>
              </Button>
            )}

            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              {isPending ? tContent('toolbar.saving') : tContent('toolbar.save')}
            </Button>

            {canPublish ? (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => submitWithStatus('published')}
              >
                {entry?.status === 'published'
                  ? t('updateLive', { singular: singularLower })
                  : tContent('toolbar.publish')}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => submitWithStatus('review')}
              >
                {tContent('toolbar.submitForReview')}
              </Button>
            )}

            {entry && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('moreOptions')}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDelete}
                  >
                    <Trash2 className="me-2 size-4" />{' '}
                    {t('deleteSingular', { singular: singularLower })}
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

                {supports.excerpt && (
                  <div className="mt-6">
                    <FieldShell
                      htmlFor="entry-excerpt"
                      label={
                        <>
                          {tContent('fields.excerpt')}{' '}
                          <span className="text-xs font-normal text-steel-400">
                            {`${excerptValue?.length ?? 0}/300`}
                          </span>
                        </>
                      }
                      hint={t('excerptHint')}
                    >
                      <textarea
                        id="entry-excerpt"
                        rows={4}
                        className={textareaClass}
                        {...register('excerpt')}
                      />
                    </FieldShell>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full border-t border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-50 lg:w-96 lg:overflow-auto lg:border-s lg:border-t-0">
            <Tabs defaultValue="entry" className="gap-0">
              <TabsList
                className={`m-3 grid ${supports.seo ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                <TabsTrigger value="entry">
                  {singular}
                </TabsTrigger>
                {supports.seo && (
                  <TabsTrigger value="seo">{tContent('tabs.seo')}</TabsTrigger>
                )}
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

                {/* Status, Visibility, Slug, Publish-at, Author, Taxonomies */}
                <div className="space-y-4 px-4">
                  {supports.status && (
                    <>
                      <FieldShell label={tContent('fields.status')} htmlFor="entry-status">
                        <select
                          id="entry-status"
                          className={inputClass}
                          {...register('status')}
                        >
                          <option value="draft">{tStatus('draft')}</option>
                          <option value="review">{tStatus('review')}</option>
                          <option value="scheduled">{tStatus('scheduled')}</option>
                          {canPublish && (
                            <option value="published">{tStatus('published')}</option>
                          )}
                        </select>
                      </FieldShell>

                      <FieldShell label={tContent('fields.visibility')} htmlFor="entry-visibility">
                        <select
                          id="entry-visibility"
                          className={inputClass}
                          {...register('visibility')}
                        >
                          <option value="public">{tVisibility('public')}</option>
                          <option value="private">{tVisibility('private')}</option>
                        </select>
                      </FieldShell>

                      {currentStatus === 'scheduled' && (
                        <FieldShell
                          label={tContent('fields.publishAt')}
                          htmlFor="entry-scheduled-at"
                          hint={t('publishAtHint')}
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

                  <EntryLanguageSection
                    collectionSlug={collection.slug}
                    entry={entry ? { id: entry.id, language: entry.language } : null}
                    language={newLanguage}
                    onLanguageChange={setNewLanguage}
                    translations={translations}
                  />

                  <FieldShell label={tContent('fields.slug')} htmlFor="entry-slug">
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
                    <FieldShell label={t('author')}>
                      <input
                        className={`${inputClass} bg-steel-50 text-steel-500 dark:bg-dark-100 dark:text-steel-400`}
                        value={
                          entry?.author?.name ||
                          entry?.author?.email ||
                          currentUserName ||
                          t('currentUser')
                        }
                        readOnly
                        disabled
                      />
                    </FieldShell>
                  )}

                  {/* Taxonomies in Sidebar like Posts */}
                  {supports.taxonomies && taxonomies.length > 0 && (
                    <div className="space-y-4 pt-2">
                      {taxonomies.map(tax => (
                        <TaxonomySelectField
                          key={tax.id}
                          taxonomy={tax}
                          terms={termsByTaxonomy[tax.id] ?? []}
                          collectionSlug={collection.slug}
                        />
                      ))}
                    </div>
                  )}

                  {supports.comments && (
                    <Controller
                      control={control}
                      name="allowComments"
                      render={({ field }) => (
                        <div className="flex items-center justify-between gap-3 pt-2">
                          <label
                            htmlFor="entry-allow-comments"
                            className="cursor-pointer text-sm font-medium text-steel-700 dark:text-steel-200"
                          >
                            {tContent('fields.allowComments')}
                          </label>
                          <Switch
                            id="entry-allow-comments"
                            checked={field.value !== false}
                            onChange={checked => field.onChange(checked)}
                          />
                        </div>
                      )}
                    />
                  )}
                </div>
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
  const t = useTranslations('collections.entries');
  const tLayoutMsgs = useTranslations('content.layout');
  const tActions = useTranslations('content.actions');
  const tLayout = useLayoutLabel();
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
        {tLayoutMsgs('title')}
      </p>
      <div className="flex items-start gap-3 rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <Icon className="mt-0.5 size-4 shrink-0 text-indigo-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {layoutLabel(target, templates, tLayout)}
          </span>
          <span className="block text-xs text-steel-500">
            {isCustom
              ? t('ownCanvas')
              : entry.templateId
                ? tLayoutMsgs('rendersThrough')
                : tLayoutMsgs('followsDefault')}
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
          {t('setTemplate')}
        </Button>
        {isCustom ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={PAGES.DASHBOARD.COLLECTION_ENTRY_BUILDER(
                collection.slug,
                entry.id
              )}
            >
              {tActions('openLayoutBuilder')}
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
                {tLayoutMsgs('editTemplate')}
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
        title={t('setEntryTemplate')}
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

function TaxonomySelectField({
  taxonomy,
  terms,
  collectionSlug,
}: {
  taxonomy: TaxonomyRow;
  terms: CollectionTermNode[];
  collectionSlug: string;
}) {
  const { control, setValue } = useFormContext();
  const allTerms = useWatch({ control, name: 'terms' }) as
    | Record<string, string[]>
    | undefined;
  const selectedIds: string[] = allTerms?.[taxonomy.id] ?? [];
  const t = useTranslations('collections.entries');

  const optionsArray: Option[] = useMemo(() => {
    return terms.map(t => ({
      value: t.id,
      label: `${'— '.repeat(t.depth ?? 0)}${t.name}`,
    }));
  }, [terms]);

  const [groupOptions, selectedOptions] = useMemo(
    () => groupSelectedOptions(optionsArray, selectedIds),
    [optionsArray, selectedIds]
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-steel-700 dark:text-steel-200">
          {taxonomy.name}
        </label>
        <Link
          href={PAGES.DASHBOARD.COLLECTION_TAXONOMY(
            collectionSlug,
            taxonomy.key
          )}
          target="_blank"
          className="text-xs text-primary hover:underline"
        >
          {t('manage')}
        </Link>
      </div>

      <ReactSelect
        isMulti
        isClearable
        options={groupOptions}
        value={handleMultiSelect(selectedOptions, selectedIds)}
        placeholder={
          optionsArray.length
            ? t('selectTerms', { name: taxonomy.name.toLowerCase() })
            : t('noTerms', { name: taxonomy.name.toLowerCase() })
        }
        isDisabled={optionsArray.length === 0}
        onChange={newValue => {
          const processedValue = handleOnChange(newValue);
          const next = Array.isArray(processedValue)
            ? (processedValue as string[])
            : processedValue
              ? [processedValue as string]
              : [];
          setValue(`terms.${taxonomy.id}`, next, { shouldDirty: true });
        }}
      />
    </div>
  );
}
