'use client';

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
}: {
  pageId?: string;
  kind?: 'page' | 'post';
}) {
  const { register, control, setValue } = useFormContext<CreatePagesInput>();
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

  const displayTitle = seoTitle || title || `Untitled ${kind}`;
  const displayDescription =
    seoDescription ||
    `Add a meta description to control how this ${kind} appears in search results.`;
  const host = env.NEXT_PUBLIC_BASE_URL.replace(/^https?:\/\//, '').replace(
    /\/$/,
    ''
  );
  const prefix = `${language && language !== 'en' ? `${language}/` : ''}${kind === 'post' ? 'blog/' : ''}`;
  const path = isHome && kind === 'page' ? '' : `${prefix}${slug ?? ''}`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div
        className="rounded-lg border border-steel-200 bg-white p-3 dark:border-dark-300 dark:bg-dark-100"
        aria-label="Search result preview"
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
            Meta title{' '}
            <Counter value={seoTitle?.length ?? 0} limit={TITLE_LIMIT} />
          </>
        }
      >
        <input
          id="seo-title"
          className={inputClass}
          placeholder={title || 'Page title'}
          {...register('seo.title')}
        />
      </FieldShell>

      <FieldShell
        htmlFor="seo-description"
        label={
          <>
            Meta description{' '}
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
        label="Keywords"
        hint="Comma separated"
      >
        <input
          id="seo-keywords"
          className={inputClass}
          {...register('seo.keywords')}
        />
      </FieldShell>

      <FieldShell
        htmlFor="seo-canonical"
        label="Canonical URL"
        hint={`Leave empty to use this ${kind}'s own URL.`}
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
            label="Hide from search engines (noindex)"
            checked={!!field.value}
            onChange={field.onChange}
          />
        )}
      />

      <hr className="border-steel-200 dark:border-dark-300" />
      <h4 className="text-sm font-semibold">Social sharing</h4>

      <FieldShell htmlFor="seo-og-title" label="Open Graph title">
        <input
          id="seo-og-title"
          className={inputClass}
          placeholder={displayTitle}
          {...register('seo.ogTitle')}
        />
      </FieldShell>

      <FieldShell htmlFor="seo-og-description" label="Open Graph description">
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
          <FieldShell label="Open Graph image">
            <MediaField value={field.value ?? ''} onChange={field.onChange} />
          </FieldShell>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FieldShell htmlFor="seo-og-type" label="OG type">
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
        <FieldShell htmlFor="seo-twitter" label="Twitter card">
          <select
            id="seo-twitter"
            className={inputClass}
            {...register('seo.twitterCard')}
          >
            <option value="summary_large_image">Large image</option>
            <option value="summary">Summary</option>
          </select>
        </FieldShell>
      </div>

      <FieldShell
        htmlFor="seo-schema"
        label="Structured data"
        hint="Adds a JSON-LD block of this type to the page."
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
