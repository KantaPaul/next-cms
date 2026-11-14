'use client';

import { useTranslations } from 'next-intl';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { MediaField } from '@/components/media/media-picker';
import { Switch } from '@/components/ui/switch';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { env } from '@/env.mjs';
import { cn } from '@/lib/utils/cn';
import { FieldShell, inputClass, textareaClass } from './field-shell';
import { SeoAiButton } from './seo-ai-button';

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

const OG_TYPES = ['website', 'article', 'product', 'profile'];
const STRUCTURED_DATA_TYPES = [
  'WebPage',
  'Article',
  'BlogPosting',
  'Product',
  'FAQPage',
  'Organization',
  'AboutPage',
  'ContactPage',
];

function Counter({ value, limit }: { value: number; limit: number }) {
  return (
    <span
      className={cn(
        'text-xs font-normal tabular-nums',
        value > limit ? 'text-red-600' : 'text-steel-400'
      )}
    >
      {value}/{limit}
    </span>
  );
}

export function SeoPanel({
  pageId,
  kind = 'page',
  pathPrefix,
}: {
  pageId?: string;
  kind?: 'page' | 'post' | 'entry';
  pathPrefix?: string;
}) {
  const { register, control, setValue } = useFormContext<CreatePagesInput>();
  const t = useTranslations('content.seo');
  const [title, slug, seoTitle, seoDescription, language, isHome] = useWatch({
    control,
    name: [
      'title',
      'slug',
      'seo.title',
      'seo.description',
      'language',
      'isHome',
    ],
  });

  const displayTitle = seoTitle || title || t('untitled', { kind });
  const displayDescription =
    seoDescription || t('descriptionFallback', { kind });
  const host = env.NEXT_PUBLIC_BASE_URL.replace(/^https?:\/\//, '').replace(
    /\/$/,
    ''
  );
  const prefix = `${language && language !== 'en' ? `${language}/` : ''}${
    kind === 'post' ? 'blog/' : kind === 'entry' ? (pathPrefix ?? '') : ''
  }`;
  const path = isHome && kind === 'page' ? '' : `${prefix}${slug ?? ''}`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div
        className="rounded-lg border border-steel-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100"
        aria-label={t('searchPreview')}
      >
        <p className="truncate text-xs text-emerald-700 dark:text-emerald-400">
          {host}
          {path ? ` › ${path.split('/').join(' › ')}` : ''}
        </p>
        <p className="truncate text-base text-sky-700 dark:text-sky-400">
          {displayTitle}
        </p>
        <p className="line-clamp-2 text-xs text-steel-600 dark:text-steel-300">
          {displayDescription}
        </p>
      </div>

      {pageId && kind === 'page' && (
        <SeoAiButton
          pageId={pageId}
          onApply={result => {
            setValue('seo.title', result.title, { shouldDirty: true });
            setValue('seo.description', result.description, {
              shouldDirty: true,
            });
            setValue('seo.keywords', result.keywords, { shouldDirty: true });
          }}
        />
      )}

      <FieldShell
        htmlFor="seo-title"
        label={
          <>
            {t('metaTitle')}{' '}
            <Counter value={seoTitle?.length ?? 0} limit={TITLE_LIMIT} />
          </>
        }
      >
        <input
          id="seo-title"
          className={inputClass}
          placeholder={title || t('titlePlaceholder')}
          {...register('seo.title')}
        />
      </FieldShell>

      <FieldShell
        htmlFor="seo-description"
        label={
          <>
            {t('metaDescription')}{' '}
            <Counter
              value={seoDescription?.length ?? 0}
              limit={DESCRIPTION_LIMIT}
            />
          </>
        }
      >
        <textarea
          id="seo-description"
          rows={3}
          className={textareaClass}
          {...register('seo.description')}
        />
      </FieldShell>

      <FieldShell
        htmlFor="seo-keywords"
        label={t('keywords')}
        hint={t('keywordsHint')}
      >
        <input
          id="seo-keywords"
          className={inputClass}
          {...register('seo.keywords')}
        />
      </FieldShell>

      <FieldShell
        htmlFor="seo-canonical"
        label={t('canonicalUrl')}
        hint={t('canonicalHint', { kind })}
      >
        <input
          id="seo-canonical"
          type="url"
          className={inputClass}
          placeholder="https://"
          {...register('seo.canonicalUrl')}
        />
      </FieldShell>

      <Controller
        control={control}
        name="seo.noIndex"
        render={({ field }) => (
          <Switch
            label={t('noIndex')}
            checked={!!field.value}
            onChange={field.onChange}
          />
        )}
      />

      <hr className="border-steel-200 dark:border-dark-300" />
      <h4 className="text-sm font-semibold">{t('socialSharing')}</h4>

      <FieldShell htmlFor="seo-og-title" label={t('ogTitle')}>
        <input
          id="seo-og-title"
          className={inputClass}
          placeholder={displayTitle}
          {...register('seo.ogTitle')}
        />
      </FieldShell>

      <FieldShell htmlFor="seo-og-description" label={t('ogDescription')}>
        <textarea
          id="seo-og-description"
          rows={2}
          className={textareaClass}
          {...register('seo.ogDescription')}
        />
      </FieldShell>

      <Controller
        control={control}
        name="seo.ogImage"
        render={({ field }) => (
          <FieldShell label={t('ogImage')}>
            <MediaField value={field.value ?? ''} onChange={field.onChange} />
          </FieldShell>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FieldShell htmlFor="seo-og-type" label={t('ogType')}>
          <select
            id="seo-og-type"
            className={inputClass}
            {...register('seo.ogType')}
          >
            {OG_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell htmlFor="seo-twitter" label={t('twitterCard')}>
          <select
            id="seo-twitter"
            className={inputClass}
            {...register('seo.twitterCard')}
          >
            <option value="summary_large_image">{t('largeImage')}</option>
            <option value="summary">{t('summary')}</option>
          </select>
        </FieldShell>
      </div>

      <FieldShell
        htmlFor="seo-schema"
        label={t('structuredData')}
        hint={t('structuredDataHint')}
      >
        <select
          id="seo-schema"
          className={inputClass}
          {...register('seo.structuredDataType')}
        >
          {STRUCTURED_DATA_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FieldShell>
    </div>
  );
}
