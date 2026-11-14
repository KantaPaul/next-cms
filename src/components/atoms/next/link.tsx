'use client';

import NextLink, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import { adminHref } from '@/lib/locale/admin-href';
import { useSiteLocales } from '@/providers/site-locales';

export type { LinkProps };

type CombinedProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export default function Link({ href, ...props }: CombinedProps) {
  const { currentLocale, defaultLocale } = useSiteLocales();
  const resolvedHref =
    typeof href === 'string' &&
    (href === '/dashboard' || href.startsWith('/dashboard/'))
      ? adminHref(href, currentLocale, defaultLocale)
      : href;

  return <NextLink href={resolvedHref} {...props} />;
}

export { Link as AdminLink };
