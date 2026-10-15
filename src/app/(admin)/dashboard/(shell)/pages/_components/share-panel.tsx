'use client';

import { formatDistanceToNow } from 'date-fns';
import { Copy, Languages, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/atoms/status-badge';
import { PAGES } from '@/config/pages';
import { SUPPORTED_LANGUAGES } from '@/db/schemas/shared.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { cn } from '@/lib/utils/cn';
import { useDataProvider } from '@/providers/data.provider';
import type { PageDetail } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { createTranslation } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.actions';
import {
  createPreviewToken,
  regeneratePreviewToken,
  revokePreviewToken,
} from '@/app/(admin)/dashboard/(shell)/pages/_modules/preview.actions';
import { PAGE_STATUS_COLORS } from './pages-table';
import { inputClass } from './field-shell';

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
  { label: '1 day', value: '1' },
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: 'Never', value: 'never' },
];

export function SharePanel({ page }: { page: PageDetail }) {
  const router = useRouter();
  const { previewTokens = [], translations = [] } = useDataProvider<{
    previewTokens?: PreviewTokenRow[];
    translations?: TranslationRow[];
  }>();
  const [expiry, setExpiry] = useState('7');
  const [language, setLanguage] = useState('');
  const [isPending, startTransition] = useTransition();

  const absoluteUrl = (token: string) => `${window.location.origin}${PAGES.SITE.PREVIEW_TOKEN(token)}`;

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(absoluteUrl(token));
    toast.success('Preview link copied');
  };

  const create = () =>
    startTransition(async () => {
      await handleActionResponse(
        await createPreviewToken({ pageId: page.id, expiresInDays: expiry === 'never' ? null : Number(expiry) }),
        row => {
          void copy((row as { token: string }).token).catch(() => toast.success('Preview link created'));
          router.refresh();
        }
      );
    });

  const regenerate = (id: string) =>
    startTransition(async () => {
      await handleActionResponse(await regeneratePreviewToken({ id }), () => {
        toast.success('Link regenerated. The old URL no longer works.');
        router.refresh();
      });
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      await handleActionResponse(await revokePreviewToken({ id }), () => {
        toast.success('Link revoked');
        router.refresh();
      });
    });

  const translate = () =>
    startTransition(async () => {
      if (!language) return;
      await handleActionResponse(await createTranslation({ id: page.id, language }), created => {
        toast.success('Translation draft created');
        router.push(PAGES.DASHBOARD.PAGES.EDIT((created as { id: string }).id));
      });
    });

  const usedLanguages = new Set([page.language, ...translations.map(t => t.language)]);
  const availableLanguages = SUPPORTED_LANGUAGES.filter(l => !usedLanguages.has(l.value));
  const languageLabel = (code: string) => SUPPORTED_LANGUAGES.find(l => l.value === code)?.label ?? code;

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <section>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4" /> Draft preview links
        </h4>
        <p className="mt-1 text-xs text-steel-500">Anyone with a link can view the current draft without signing in.</p>
        <div className="mt-3 flex gap-2">
          <select aria-label="Link expiry" value={expiry} onChange={e => setExpiry(e.target.value)} className={cn(inputClass, 'w-auto')}>
            {EXPIRY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                Expires: {o.label}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={create} disabled={isPending}>
            <Plus /> New link
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {previewTokens.length === 0 && <li className="text-xs text-steel-400">No preview links yet.</li>}
          {previewTokens.map(token => {
            const expired = !!token.expiresAt && new Date(token.expiresAt).getTime() < Date.now();
            const inactive = token.status === 'revoked' || expired;
            return (
              <li
                key={token.id}
                className={cn('rounded-md border border-steel-200 p-2.5 text-xs dark:border-dark-300', inactive && 'opacity-60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate">…{token.token.slice(-10)}</code>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-medium',
                      inactive ? 'bg-steel-100 text-steel-600' : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    {token.status === 'revoked' ? 'Revoked' : expired ? 'Expired' : 'Active'}
                  </span>
                </div>
                <p className="mt-1 text-steel-500">
                  {token.viewCount} view{token.viewCount === 1 ? '' : 's'}
                  {token.lastAccessedAt && ` · last opened ${formatDistanceToNow(new Date(token.lastAccessedAt), { addSuffix: true })}`}
                  {token.expiresAt && !expired && ` · expires ${formatDistanceToNow(new Date(token.expiresAt), { addSuffix: true })}`}
                </p>
                <div className="mt-2 flex gap-1">
                  {!inactive && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => copy(token.token)}>
                      <Copy /> Copy
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => regenerate(token.id)} disabled={isPending}>
                    <RefreshCw /> Regenerate
                  </Button>
                  {token.status === 'active' && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => revoke(token.id)} disabled={isPending}>
                      <Trash2 /> Revoke
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="size-4" /> Translations
        </h4>
        <p className="mt-1 text-xs text-steel-500">This page is in {languageLabel(page.language)}.</p>
        <ul className="mt-3 space-y-2">
          {translations.map(t => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-steel-200 p-2.5 text-sm dark:border-dark-300">
              <Link href={PAGES.DASHBOARD.PAGES.EDIT(t.id)} className="min-w-0 truncate hover:underline">
                <span className="font-medium">{languageLabel(t.language)}</span> · {t.title}
              </Link>
              <StatusBadge status={t.status} statusColor={PAGE_STATUS_COLORS[t.status]} />
            </li>
          ))}
        </ul>
        {availableLanguages.length > 0 && (
          <div className="mt-3 flex gap-2">
            <select aria-label="Translation language" value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
              <option value="">Add a language…</option>
              {availableLanguages.map(l => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="outline" onClick={translate} disabled={!language || isPending}>
              Create
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
