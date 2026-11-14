'use client';

import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { PAGE_STATUS, VISIBILITY_STATUS } from '@/db/schemas/shared.schema';

export type PageStatusValue = (typeof PAGE_STATUS)[number];

/** Translated label for a page/post status, e.g. `review` → "In review". */
export function useStatusLabel() {
  const t = useTranslations('common.statuses');
  return useCallback(
    (status: string) =>
      (PAGE_STATUS as readonly string[]).includes(status)
        ? t(status as PageStatusValue)
        : status,
    [t]
  );
}

/** Page/post status select options with translated labels. */
export function useStatusOptions() {
  const label = useStatusLabel();
  return useMemo(
    () => PAGE_STATUS.map(value => ({ value, label: label(value) })),
    [label]
  );
}

/** Public/private select options with translated labels. */
export function useVisibilityOptions() {
  const t = useTranslations('common.visibilities');
  return useMemo(
    () => VISIBILITY_STATUS.map(value => ({ value, label: t(value) })),
    [t]
  );
}

/**
 * "5 minutes ago" in the admin UI language. Re-renders once a minute so the
 * text stays current.
 */
export function useRelativeTime() {
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  return useCallback(
    (date: Date | string | number) => format.relativeTime(new Date(date), now),
    [format, now]
  );
}
