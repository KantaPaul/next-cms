'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { switchSite } from '@/server/actions/site.actions';

export function SiteSwitcher({
  current,
  memberships,
}: {
  current: string;
  memberships: { siteId: string; siteName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Site</span>
      <select
        className="h-9 max-w-44 rounded-md border border-steel-200 bg-white px-2 text-sm dark:border-dark-300 dark:bg-dark-100"
        value={current}
        disabled={pending || memberships.length < 2}
        onChange={event => {
          const siteId = event.target.value;
          startTransition(async () => {
            await switchSite(siteId);
            router.refresh();
          });
        }}
      >
        {memberships.map(site => (
          <option key={site.siteId} value={site.siteId}>
            {site.siteName}
          </option>
        ))}
      </select>
    </label>
  );
}
