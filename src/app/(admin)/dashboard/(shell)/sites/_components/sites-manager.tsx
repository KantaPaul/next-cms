'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { createSite } from '@/server/actions/site.actions';

const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm dark:border-dark-300 dark:bg-dark-100';

export function SitesManager({
  sites,
  current,
}: {
  current: string;
  sites: {
    siteId: string;
    siteName: string;
    roleName: string;
    primaryHost: string | null;
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [primaryHost, setPrimaryHost] = useState('');
  const [extraDomains, setExtraDomains] = useState('');
  const [selected, setSelected] = useState<string[]>(['en']);
  const [defaultLocale, setDefaultLocale] = useState('en');

  const toggle = (code: string) => {
    setSelected(currentCodes => {
      const next = currentCodes.includes(code)
        ? currentCodes.filter(item => item !== code)
        : [...currentCodes, code];
      if (!next.includes(defaultLocale)) setDefaultLocale(next[0] ?? 'en');
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const locales = DEFAULT_SITE_LOCALES.filter(locale =>
      selected.includes(locale.code)
    );
    startTransition(async () => {
      await handleActionResponse(
        createSite({
          name,
          primaryHost,
          extraDomains,
          defaultLocale,
          locales,
        }),
        () => {
          toast.success('Site created');
          setName('');
          setPrimaryHost('');
          setExtraDomains('');
          router.refresh();
        }
      );
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
        {sites.map(site => (
          <li key={site.siteId} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">
                {site.siteName}
                {site.siteId === current ? (
                  <span className="ml-2 text-xs text-steel-500">Current</span>
                ) : null}
              </p>
              <p className="text-sm text-steel-500">
                {site.primaryHost || 'No primary host'} · {site.roleName}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="grid gap-3 rounded-lg border border-steel-200 p-4 dark:border-dark-300">
        <h2 className="font-semibold">New site</h2>
        <label className="grid gap-1 text-sm">
          Name
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Primary host
          <input
            className={inputClass}
            value={primaryHost}
            onChange={e => setPrimaryHost(e.target.value)}
            placeholder="example.com"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Extra domains
          <textarea
            className="min-h-20 w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-sm dark:border-dark-300 dark:bg-dark-100"
            value={extraDomains}
            onChange={e => setExtraDomains(e.target.value)}
            placeholder="www.example.com"
          />
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend>Languages</legend>
          {DEFAULT_SITE_LOCALES.map(locale => (
            <label key={locale.code} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(locale.code)}
                onChange={() => toggle(locale.code)}
              />
              {locale.label}
            </label>
          ))}
        </fieldset>
        <label className="grid gap-1 text-sm">
          Default language
          <select
            className={inputClass}
            value={defaultLocale}
            onChange={e => setDefaultLocale(e.target.value)}
          >
            {DEFAULT_SITE_LOCALES.filter(locale => selected.includes(locale.code)).map(
              locale => (
                <option key={locale.code} value={locale.code}>
                  {locale.label}
                </option>
              )
            )}
          </select>
        </label>
        <Button type="submit" disabled={pending || selected.length === 0}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Create site
        </Button>
      </form>
    </div>
  );
}
