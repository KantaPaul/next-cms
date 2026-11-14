'use client';

import { useTranslations } from 'next-intl';
import Link from '@/components/atoms/next/link';
import { useFormContext, useWatch } from 'react-hook-form';
import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import {
  useStatusOptions,
  useVisibilityOptions,
} from '@/i18n/use-content-labels';
import { useSiteLocales } from '@/providers/site-locales';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { cn } from '@/lib/utils/cn';
import { useCan } from '@/providers/access.provider';
import { FieldShell, inputClass } from './field-shell';

export type TaxonomyOptions = {
  categories: { label: string; value: string }[];
  tags: { label: string; value: string }[];
};

export type SidebarEditorProps = {
  className?: string;
  taxonomy: TaxonomyOptions;
  templates?: { id: string; name: string; category: string }[];
  globalBlocks?: { id: string; name: string; category: string }[];
  currentStatus?: string;
};

export const SidebarEditor = ({
  className,
  taxonomy,
  templates = [],
  globalBlocks = [],
  currentStatus,
}: SidebarEditorProps) => {
  const { locales } = useSiteLocales();
  const canPublish = useCan(PERMISSIONS.PAGES_PUBLISH);
  const { register, control, formState } = useFormContext<CreatePagesInput>();
  const status = useWatch({ control, name: 'status' });
  const headerTemplateId = useWatch({ control, name: 'headerTemplateId' });
  const footerTemplateId = useWatch({ control, name: 'footerTemplateId' });
  const t = useTranslations('content.fields');
  const allStatusOptions = useStatusOptions();
  const visibilityOptions = useVisibilityOptions();

  const statusOptions = canPublish
    ? allStatusOptions
    : allStatusOptions.filter(
        o => ['draft', 'review'].includes(o.value) || o.value === currentStatus
      );

  const isHeader = (item: { name: string; category: string }) => {
    const cat = item.category?.toLowerCase() ?? '';
    const name = item.name?.toLowerCase() ?? '';
    return cat === 'header' || cat === 'general' || name.includes('header');
  };

  const isFooter = (item: { name: string; category: string }) => {
    const cat = item.category?.toLowerCase() ?? '';
    const name = item.name?.toLowerCase() ?? '';
    return cat === 'footer' || cat === 'general' || name.includes('footer');
  };

  const headerCandidates = [
    ...globalBlocks.filter(isHeader).map(g => ({
      label: `${g.name} (${g.category})`,
      value: g.id,
    })),
    ...templates.filter(isHeader).map(t => ({
      label: `${t.name} (${t.category})`,
      value: t.id,
    })),
  ];
  const seenHeaderIds = new Set<string>();
  const uniqueHeaders: { label: string; value: string }[] = [];
  for (const h of headerCandidates) {
    if (!seenHeaderIds.has(h.value)) {
      seenHeaderIds.add(h.value);
      uniqueHeaders.push(h);
    }
  }

  const footerCandidates = [
    ...globalBlocks.filter(isFooter).map(g => ({
      label: `${g.name} (${g.category})`,
      value: g.id,
    })),
    ...templates.filter(isFooter).map(t => ({
      label: `${t.name} (${t.category})`,
      value: t.id,
    })),
  ];
  const seenFooterIds = new Set<string>();
  const uniqueFooters: { label: string; value: string }[] = [];
  for (const f of footerCandidates) {
    if (!seenFooterIds.has(f.value)) {
      seenFooterIds.add(f.value);
      uniqueFooters.push(f);
    }
  }

  const headerOptions = [
    { label: t('siteDefault'), value: '' },
    { label: t('noneHeader'), value: 'none' },
    ...uniqueHeaders,
  ];

  const footerOptions = [
    { label: t('siteDefault'), value: '' },
    { label: t('noneFooter'), value: 'none' },
    ...uniqueFooters,
  ];

  return (
    <div className={cn('pb-4', className)}>
      <FieldFactory<CreatePagesInput>
        variant="default"
        className="gap-0 space-y-4 divide-y sm:grid-cols-1 xl:gap-0 2xl:grid-cols-1 [&>div]:px-4 [&>div]:pt-4"
        fields={[
          [
            {
              name: 'status',
              label: t('status'),
              type: 'select',
              placeholder: t('selectStatus'),
              options: statusOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'visibility',
              label: t('visibility'),
              type: 'select',
              placeholder: t('selectVisibility'),
              options: visibilityOptions,
              isRequired: true,
              isClearable: false,
            },
            {
              name: 'slug',
              label: t('slug'),
              type: 'text',
              placeholder: 'my-page',
              isRequired: true,
            },
            {
              name: 'language',
              label: t('language'),
              type: 'select',
              options: locales,
              isClearable: false,
            },
            {
              name: 'isHome',
              label: t('useAsHome'),
              type: 'switch',
            },
            {
              name: 'isBlogIndex',
              label: t('useAsBlog'),
              type: 'switch',
            },
            {
              name: 'categories',
              label: t('categories'),
              type: 'multiselect',
              placeholder: taxonomy.categories.length
                ? t('selectCategories')
                : t('noCategories'),
              options: taxonomy.categories,
            },
            {
              name: 'tags',
              label: t('tags'),
              type: 'multiselect',
              placeholder: taxonomy.tags.length ? t('selectTags') : t('noTags'),
              options: taxonomy.tags,
            },
            {
              name: 'headerTemplateId',
              label: (
                <span className="flex items-center justify-between w-full">
                  <span>{t('headerTemplate')}</span>
                  {headerTemplateId ? (
                    <Link
                      href={PAGES.DASHBOARD.HEADER_FOOTER_EDIT(headerTemplateId)}
                      target="_blank"
                      className="text-xs font-normal text-indigo-600 hover:underline"
                    >
                      {t('edit')}
                    </Link>
                  ) : null}
                </span>
              ),
              type: 'select',
              options: headerOptions,
              isClearable: true,
            },
            {
              name: 'footerTemplateId',
              label: (
                <span className="flex items-center justify-between w-full">
                  <span>{t('footerTemplate')}</span>
                  {footerTemplateId ? (
                    <Link
                      href={PAGES.DASHBOARD.HEADER_FOOTER_EDIT(footerTemplateId)}
                      target="_blank"
                      className="text-xs font-normal text-indigo-600 hover:underline"
                    >
                      {t('edit')}
                    </Link>
                  ) : null}
                </span>
              ),
              type: 'select',
              options: footerOptions,
              isClearable: true,
            },
          ],
        ]}
      />
      {status === 'scheduled' && (
        <div className="px-4 pt-4">
          <FieldShell
            label={t('publishAt')}
            htmlFor="scheduledAt"
            hint={t('publishAtHint', { kind: 'page' })}
            error={formState.errors.scheduledAt?.message as string | undefined}
          >
            <input
              id="scheduledAt"
              type="datetime-local"
              className={inputClass}
              {...register('scheduledAt')}
            />
          </FieldShell>
        </div>
      )}
      {!canPublish && (
        <p className="mx-4 mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {t('roleNotice', { kind: 'page' })}
        </p>
      )}
    </div>
  );
};
