'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  type LocaleLink,
  localeLinksForPath,
} from '@/server/services/locale-switcher';
import { el, linkEl } from '@/builder/blocks/element';
import type { ElementStyle } from '@/builder/style';

export function LanguageSwitcher({
  elements,
}: {
  elements?: Record<string, ElementStyle>;
} = {}) {
  const pathname = usePathname();
  const [links, setLinks] = useState<LocaleLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    localeLinksForPath(pathname).then(next => {
      if (!cancelled) setLinks(next.length > 1 ? next : []);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (links.length < 2) return null;

  const styled = { elements };

  return (
    <nav aria-label="Languages" className="flex items-center gap-2 text-sm">
      {links.map(link =>
        link.current ? (
          <span
            key={link.code}
            aria-current="true"
            {...el(styled, 'current', 'font-semibold')}
          >
            {link.label}
          </span>
        ) : (
          <a
            key={link.code}
            href={link.href}
            {...linkEl(styled, 'link', 's-muted hover:opacity-80')}
          >
            {link.label}
          </a>
        )
      )}
    </nav>
  );
}
