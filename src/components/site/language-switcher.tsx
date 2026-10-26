'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  type LocaleLink,
  localeLinksForPath,
} from '@/server/services/locale-switcher';

export function LanguageSwitcher() {
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

  return (
    <nav aria-label="Languages" className="flex items-center gap-2 text-sm">
      {links.map(link =>
        link.current ? (
          <span key={link.code} aria-current="true" className="font-semibold">
            {link.label}
          </span>
        ) : (
          <a
            key={link.code}
            href={link.href}
            className="s-muted hover:opacity-80"
          >
            {link.label}
          </a>
        )
      )}
    </nav>
  );
}
