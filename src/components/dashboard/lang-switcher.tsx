'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  handleSelected,
  type Option,
  ReactSelect,
} from '@/components/atoms/react-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import {
  adminHref,
  stripAdminLocale,
  swapAdminLocale,
} from '@/lib/locale/admin-href';
import { ADMIN_LOCALE_COOKIE } from '@/lib/locale/admin-locale';
import { cn } from '@/lib/utils/cn';
import { useSiteLocales } from '@/providers/site-locales';
import {
  createTranslationForLocaleAction,
  findTranslationAction,
  type TranslatableKind,
} from '@/server/actions/translation.actions';

type SingleItemTarget = {
  kind: TranslatableKind;
  id: string;
  buildPath: (newId: string) => string;
};

const COLLECTION_RESERVED = new Set([
  'create',
  'settings',
  'templates',
  'blocks',
  'comments',
  'taxonomy',
]);

function parseSingleItemRoute(pathname: string): SingleItemTarget | null {
  const { path } = stripAdminLocale(pathname);

  const pageMatch = path.match(/^\/dashboard\/pages\/([^/]+)\/(edit|builder)$/);
  if (pageMatch && pageMatch[1] !== 'create') {
    const [, id, mode] = pageMatch;
    return {
      kind: 'page',
      id,
      buildPath: (newId) => `/dashboard/pages/${newId}/${mode}`,
    };
  }

  const postMatch = path.match(/^\/dashboard\/posts\/([^/]+)\/(edit|builder)$/);
  if (postMatch && postMatch[1] !== 'create') {
    const [, id, mode] = postMatch;
    return {
      kind: 'post',
      id,
      buildPath: (newId) => `/dashboard/posts/${newId}/${mode}`,
    };
  }

  const colMatch = path.match(
    /^\/dashboard\/collections\/([^/]+)\/([^/]+)(?:\/(builder))?$/
  );
  if (colMatch && !COLLECTION_RESERVED.has(colMatch[2])) {
    const [, slug, entryId, mode] = colMatch;
    return {
      kind: 'collection',
      id: entryId,
      buildPath: (newId) =>
        mode
          ? `/dashboard/collections/${slug}/${newId}/${mode}`
          : `/dashboard/collections/${slug}/${newId}`,
    };
  }

  return null;
}

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
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [missingDialog, setMissingDialog] = useState<{
    code: string;
    label: string;
    item: SingleItemTarget;
  } | null>(null);

  const effectiveDefaultLocale =
    defaultLocale || context.defaultLocale || 'en';

  const rawLocales =
    locales && locales.length > 0
      ? locales
      : context.locales && context.locales.length > 0
        ? context.locales
        : DEFAULT_SITE_LOCALES;

  const options: Option[] = useMemo(() => {
    return rawLocales.map((l) => ({
      label: l.label,
      value: (l as { code?: string; value?: string }).code || (l as { value: string }).value,
    }));
  }, [rawLocales]);

  const selected = context.currentLocale || effectiveDefaultLocale;
  const selectedOption =
    handleSelected(options, selected) ||
    handleSelected(options, effectiveDefaultLocale);

  const persistCookie = (code: string) => {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const navigateWithLocale = (targetPath: string, code: string) => {
    context.setCurrentLocale?.(code);
    persistCookie(code);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('language');
    const query = params.toString();
    const dest = adminHref(
      query ? `${targetPath}?${query}` : targetPath,
      code,
      effectiveDefaultLocale
    );
    router.push(dest);
  };

  return (
    <>
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
        onChange={(event) => {
          const opt = event as Option;
          const code = opt.value;
          const single = parseSingleItemRoute(pathname);

          startTransition(async () => {
            if (single) {
              const res = await findTranslationAction(single.kind, single.id, code);
              if (res.found && res.id) {
                navigateWithLocale(single.buildPath(res.id), code);
              } else {
                setMissingDialog({ code, label: opt.label, item: single });
              }
              return;
            }

            context.setCurrentLocale?.(code);
            persistCookie(code);
            const params = new URLSearchParams(searchParams.toString());
            params.delete('language');
            params.delete('page');
            const query = params.toString();
            router.push(
              swapAdminLocale(
                query ? `${pathname}?${query}` : pathname,
                code,
                effectiveDefaultLocale
              )
            );
          });
        }}
        options={options}
      />

      <Dialog
        open={Boolean(missingDialog)}
        onOpenChange={(open) => {
          if (!open) setMissingDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('noTranslationTitle', { language: missingDialog?.label ?? '' })}
            </DialogTitle>
            <DialogDescription>
              {t('noTranslationDescription', {
                language: missingDialog?.label ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMissingDialog(null)}
            >
              {t('stayHere')}
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!missingDialog) return;
                const { code, label, item } = missingDialog;
                startTransition(async () => {
                  const created = await createTranslationForLocaleAction(
                    item.kind,
                    item.id,
                    code
                  );
                  setMissingDialog(null);
                  if (!created.ok) {
                    toast.error(created.error);
                    return;
                  }
                  toast.success(`${label} translation draft created`);
                  navigateWithLocale(item.buildPath(created.id), code);
                });
              }}
            >
              {t('createTranslation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
