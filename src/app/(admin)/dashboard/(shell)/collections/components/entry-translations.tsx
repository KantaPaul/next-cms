'use client';

import { useTranslations } from 'next-intl';
import { useStatusLabel } from '@/i18n/use-content-labels';
import { useState, useTransition } from 'react';
import NextLink from 'next/link';
import { adminHref } from '@/lib/locale/admin-href';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/atoms/status-badge';
import {
  FieldShell,
  inputClass,
} from '@/app/(admin)/dashboard/(shell)/pages/_components/field-shell';
import { PAGE_STATUS_COLORS } from '@/app/(admin)/dashboard/(shell)/pages/_components/pages-table';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useSiteLocales } from '@/providers/site-locales';
import { createEntryTranslationAction } from '../_modules/collections.actions';

export type EntryTranslationRow = {
  id: string;
  language: string;
  slug: string;
  status: string;
  data?: unknown;
};

const titleOf = (row: EntryTranslationRow) => {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const value = data.title ?? data.name ?? data.label;
  return typeof value === 'string' && value.trim() ? value : row.slug;
};

/**
 * Language of an entry. A new entry picks its language; a saved one shows it,
 * lists its other language versions, and can start a new translation.
 */
export function EntryLanguageSection({
  collectionSlug,
  entry,
  language,
  onLanguageChange,
  translations,
}: {
  collectionSlug: string;
  /** The saved entry, or null while creating one. */
  entry: { id: string; language: string } | null;
  /** Language picked for a new entry. */
  language: string;
  onLanguageChange: (language: string) => void;
  translations: EntryTranslationRow[];
}) {
  const router = useRouter();
  const { locales, defaultLocale } = useSiteLocales();
  // A translation opens in its own language, not the one the dashboard is in.
  const editInLanguage = (id: string, code: string) =>
    adminHref(
      PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(collectionSlug, id),
      code,
      defaultLocale
    );
  const [target, setTarget] = useState('');
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('collections.entries.language');
  const statusLabel = useStatusLabel();
  const labelOf = (code: string) =>
    locales.find(l => l.value === code)?.label ?? code;

  if (!entry) {
    return (
      <FieldShell
        label={t('label')}
        htmlFor="entry-language"
        hint={t('hint')}
      >
        <select
          id="entry-language"
          className={inputClass}
          value={language}
          onChange={e => onLanguageChange(e.target.value)}
        >
          {locales.map(l => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  const used = new Set([entry.language, ...translations.map(t => t.language)]);
  const available = locales.filter(l => !used.has(l.value));

  const translate = () =>
    startTransition(async () => {
      if (!target) return;
      await handleActionResponse(
        await createEntryTranslationAction({ id: entry.id, language: target }),
        created => {
          toast.success(t('translationCreated', { language: labelOf(target) }));
          setTarget('');
          router.push(
            editInLanguage((created as { id: string }).id, target)
          );
        }
      );
    });

  return (
    <section className="space-y-3 rounded-md border border-steel-200 p-3 dark:border-dark-300">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="size-4" /> {t('title')}
        </h4>
        <p className="mt-1 text-xs text-steel-500">
          {t.rich('entryIsIn', {
            language: labelOf(entry.language),
            b: chunks => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
          })}
        </p>
      </div>

      {translations.length > 0 && (
        <ul className="space-y-2">
          {translations.map(tr => (
            <li
              key={tr.id}
              className="flex items-center justify-between gap-2 rounded-md border border-steel-200 p-2 text-sm dark:border-dark-300"
            >
              <NextLink
                href={editInLanguage(tr.id, tr.language)}
                className="min-w-0 truncate hover:underline"
              >
                <span className="font-medium">{labelOf(tr.language)}</span> ·{' '}
                {titleOf(tr)}
              </NextLink>
              <StatusBadge
                status={tr.status as never}
                label={statusLabel(tr.status)}
                statusColor={
                  PAGE_STATUS_COLORS[tr.status as keyof typeof PAGE_STATUS_COLORS]
                }
              />
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <div className="flex gap-2">
          <select
            aria-label={t('translationLanguage')}
            value={target}
            onChange={e => setTarget(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('addLanguage')}</option>
            {available.map(l => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={translate}
            disabled={!target || isPending}
          >
            {t('translate')}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-steel-500">
          {t('allTranslated')}
        </p>
      )}
    </section>
  );
}
