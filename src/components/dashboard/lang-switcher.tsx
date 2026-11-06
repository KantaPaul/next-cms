'use client';

import { useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
  handleSelected,
  type Option,
  ReactSelect,
} from '@/components/atoms/react-select';
import { useSiteLocales } from '@/providers/site-locales';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { cn } from '@/lib/utils/cn';
import {
  ADMIN_LOCALE_COOKIE,
  isLanguageFilteredRoute,
} from '@/lib/locale/admin-locale';

export function LangSwitcher({
  locales,
  defaultLocale,
  className,
}: {
  locales?: { code: string; label: string }[];
  defaultLocale?: string;
  className?: string;
}) {
  const context = useSiteLocales();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const effectiveDefaultLocale =
    defaultLocale || context.defaultLocale || 'en';

  const rawLocales =
    locales && locales.length > 0
      ? locales
      : context.locales && context.locales.length > 0
        ? context.locales
        : DEFAULT_SITE_LOCALES;

  const options: Option[] = useMemo(() => {
    return rawLocales.map(l => ({
      label: l.label,
      value: (l as any).code || (l as any).value,
    }));
  }, [rawLocales]);

  // The chosen language (cms_locale cookie, read by the dashboard layout)
  // survives navigation; until one is picked, the site's default.
  const selected = context.chosenLocale ?? effectiveDefaultLocale;

  const selectedOption =
    handleSelected(options, selected) ||
    handleSelected(options, effectiveDefaultLocale);

  return (
    <ReactSelect
      isSearchable={false}
      isClearable={false}
      size="md"
      menuPlacement="top"
      placeholder=""
      prefix={<Globe className="h-4 w-4 text-muted-foreground shrink-0" />}
      className={cn('max-w-40 min-w-28', className)}
      value={selectedOption}
      disabled={pending || options.length < 2}
      onChange={event => {
        const code = (event as Option).value;
        context.setCurrentLocale?.(code);
        document.cookie = `${ADMIN_LOCALE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
        startTransition(() => {
          // On a list that filters by language, show the new language's items.
          if (isLanguageFilteredRoute(pathname)) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('language', code);
            params.delete('page');
            router.replace(`${pathname}?${params.toString()}`);
          } else {
            router.refresh();
          }
        });
      }}
      options={options}
    />
  );
}
