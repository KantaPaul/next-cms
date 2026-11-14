'use client';

import { useRelativeTime } from '@/i18n/use-content-labels';

/** "5 minutes ago", localised to the admin UI language. */
export function RelativeTime({
  date,
  className,
}: {
  date: Date | string | number;
  className?: string;
}) {
  const relative = useRelativeTime();
  const value = new Date(date);
  return (
    <time dateTime={value.toISOString()} className={className}>
      {relative(value)}
    </time>
  );
}
