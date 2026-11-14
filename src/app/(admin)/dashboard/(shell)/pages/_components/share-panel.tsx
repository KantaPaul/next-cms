'use client';

import { useTranslations } from 'next-intl';
import { Copy, Languages, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createTranslation } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import type { PageDetail } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import {
  createPreviewToken,
  regeneratePreviewToken,
  revokePreviewToken,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/preview.actions';
import { StatusBadge } from '@/components/atoms/status-badge';
import { Button } from '@/components/ui/button';
import { PAGES } from '@/config/pages';
import NextLink from 'next/link';
import { adminHref } from '@/lib/locale/admin-href';
import { useSiteLocales } from '@/providers/site-locales';
import { useRelativeTime, useStatusLabel } from '@/i18n/use-content-labels';
import { cn } from '@/lib/utils/cn';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useDataProvider } from '@/providers/data.provider';
import { inputClass } from './field-shell';
import { PAGE_STATUS_COLORS } from './pages-table';

export type PreviewTokenRow = {
  id: string;
  token: string;
  status: 'active' | 'revoked';
  expiresAt: Date | null;
  viewCount: number;
  lastAccessedAt: Date | null;
  createdAt: Date;
  createdByName: string | null;
};

export type TranslationRow = {
  id: string;
  language: string;
  title: string;
  slug: string;
  status: keyof typeof PAGE_STATUS_COLORS;
};

const EXPIRY_OPTIONS = [
  { labelKey: 'oneDay', value: '1' },
  { labelKey: 'sevenDays', value: '7' },
  { labelKey: 'thirtyDays', value: '30' },
  { labelKey: 'never', value: 'never' },
] as const;

/** Shareable draft links for one page or one post. Rows come from the `previewTokens` data provider key. */
export function PreviewLinksSection({
  pageId,
  postId,
}: {
  pageId?: string;
  postId?: string;
}) {
  const router = useRouter();
  const { previewTokens = [] } = useDataProvider<{
    previewTokens?: PreviewTokenRow[];
  }>();
  const [expiry, setExpiry] = useState('7');
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('content.share');
  const relative = useRelativeTime();

  const absoluteUrl = (token: string) =>
    `${window.location.origin}${PAGES.SITE.PREVIEW_TOKEN(token)}`;

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(absoluteUrl(token));
    toast.success(t('copied'));
  };

  const create = () =>
    startTransition(async () => {
      await handleActionResponse(
        await createPreviewToken({
          pageId,
          postId,
          expiresInDays: expiry === 'never' ? null : Number(expiry),
        }),
        row => {
          void copy((row as { token: string }).token).catch(() =>
            toast.success(t('created'))
          );
          router.refresh();
        }
      );
    });

  const regenerate = (id: string) =>
    startTransition(async () => {
      await handleActionResponse(await regeneratePreviewToken({ id }), () => {
        toast.success(t('regenerated'));
        router.refresh();
      });
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      await handleActionResponse(await revokePreviewToken({ id }), () => {
        toast.success(t('revokedToast'));
        router.refresh();
      });
    });

  return (
    <section>
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Link2 className="size-4" /> {t('previewLinks')}
      </h4>
      <p className="mt-1 text-xs text-steel-500">
        {t('previewLinksHint')}
      </p>
      <div className="mt-3 flex gap-2">
        <select
          aria-label={t('linkExpiry')}
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className={cn(inputClass, 'w-auto')}
        >
          {EXPIRY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {t('expires', { label: t(`expiry.${o.labelKey}`) })}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={create} disabled={isPending}>
          <Plus /> {t('newLink')}
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {previewTokens.length === 0 && (
          <li className="text-xs text-steel-400">{t('noLinks')}</li>
        )}
        {previewTokens.map(token => {
          const expired =
            !!token.expiresAt &&
            new Date(token.expiresAt).getTime() < Date.now();
          const inactive = token.status === 'revoked' || expired;
          return (
            <li
              key={token.id}
              className={cn(
                'rounded-md border border-steel-200 p-2.5 text-xs dark:border-dark-300',
                inactive && 'opacity-60'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <code className="truncate">…{token.token.slice(-10)}</code>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-medium',
                    inactive
                      ? 'bg-steel-100 text-steel-600'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {token.status === 'revoked'
                    ? t('revoked')
                    : expired
                      ? t('expired')
                      : t('active')}
                </span>
              </div>
              <p className="mt-1 text-steel-500">
                {[
                  t('views', { count: token.viewCount }),
                  token.lastAccessedAt &&
                    t('lastOpened', { time: relative(token.lastAccessedAt) }),
                  token.expiresAt &&
                    !expired &&
                    t('expiresIn', { time: relative(token.expiresAt) }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div className="mt-2 flex gap-1">
                {!inactive && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(token.token)}
                  >
                    <Copy /> {t('copy')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => regenerate(token.id)}
                  disabled={isPending}
                >
                  <RefreshCw /> {t('regenerate')}
                </Button>
                {token.status === 'active' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => revoke(token.id)}
                    disabled={isPending}
                  >
                    <Trash2 /> {t('revoke')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function SharePanel({ page }: { page: PageDetail }) {
  const router = useRouter();
  const { translations = [] } = useDataProvider<{
    translations?: TranslationRow[];
  }>();
  const [language, setLanguage] = useState('');
  const [isPending, startTransition] = useTransition();
  const tShare = useTranslations('content.share');
  const statusLabel = useStatusLabel();
  const { locales, defaultLocale } = useSiteLocales();
  // A translation opens in its own language, not the one the dashboard is in.
  const editInLanguage = (id: string, code: string) =>
    adminHref(PAGES.DASHBOARD.PAGES.EDIT(id), code, defaultLocale);

  const translate = () =>
    startTransition(async () => {
      if (!language) return;
      await handleActionResponse(
        await createTranslation({ id: page.id, language }),
        created => {
          toast.success(tShare('translationCreated'));
          router.push(editInLanguage((created as { id: string }).id, language));
        }
      );
    });

  const usedLanguages = new Set([
    page.language,
    ...translations.map(t => t.language),
  ]);
  const availableLanguages = locales.filter(
    l => !usedLanguages.has(l.value)
  );
  const languageLabel = (code: string) =>
    locales.find(l => l.value === code)?.label ?? code;

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <PreviewLinksSection pageId={page.id} />

      <section>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="size-4" /> {tShare('translations')}
        </h4>
        <p className="mt-1 text-xs text-steel-500">
          {tShare('thisPageIsIn', { language: languageLabel(page.language) })}
        </p>
        <ul className="mt-3 space-y-2">
          {translations.map(t => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md border border-steel-200 p-2.5 text-sm dark:border-dark-300"
            >
              <NextLink
                href={editInLanguage(t.id, t.language)}
                className="min-w-0 truncate hover:underline"
              >
                <span className="font-medium">{languageLabel(t.language)}</span>{' '}
                · {t.title}
              </NextLink>
              <StatusBadge
                status={t.status}
                label={statusLabel(t.status)}
                statusColor={PAGE_STATUS_COLORS[t.status]}
              />
            </li>
          ))}
        </ul>
        {availableLanguages.length > 0 && (
          <div className="mt-3 flex gap-2">
            <select
              aria-label={tShare('translationLanguage')}
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className={inputClass}
            >
              <option value="">{tShare('addLanguage')}</option>
              {availableLanguages.map(l => (
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
              disabled={!language || isPending}
            >
              {tShare('create')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
