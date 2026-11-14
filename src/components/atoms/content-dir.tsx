'use client';

import { dirFor } from '@/i18n/config';
import { cn } from '@/lib/utils/cn';

/**
 * Sets `dir` and `lang` on a wrapper around content-language fields
 * (e.g. title, slug, excerpt, rich-text editor, preview) so that an English UI
 * editing Arabic content keeps chrome LTR while the content itself is RTL.
 */
export function ContentDir({
  locale,
  dir,
  className,
  children,
}: {
  locale?: string | null;
  dir?: 'ltr' | 'rtl';
  className?: string;
  children: React.ReactNode;
}) {
  const resolvedDir = dir ?? dirFor(locale);
  return (
    <div
      lang={locale || undefined}
      dir={resolvedDir}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
