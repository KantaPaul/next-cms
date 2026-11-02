'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
  handleSelected,
  type Option,
  ReactSelect,
} from '@/components/atoms/react-select';
import { useSiteLocales } from '@/providers/site-locales';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { cn } from '@/lib/utils/cn';

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

  // Default site language is always set as the default value
  const [selected, setSelected] = useState<string>(effectiveDefaultLocale);

  useEffect(() => {
    // Whenever defaultLocale changes (e.g. site switch), reset to default site language
    setSelected(effectiveDefaultLocale);
    context.setCurrentLocale?.(effectiveDefaultLocale);
  }, [effectiveDefaultLocale]);

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
        setSelected(code);
        context.setCurrentLocale?.(code);
        document.cookie = `cms_locale=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
        startTransition(() => {
          router.refresh();
        });
      }}
      options={options}
    />
  );
}
