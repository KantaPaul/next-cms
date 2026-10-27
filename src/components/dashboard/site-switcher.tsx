'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  handleSelected,
  type Option,
  ReactSelect,
} from '@/components/atoms/react-select';
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

  const options = memberships.map(site => ({
    label: site.siteName,
    value: site.siteId,
  }));

  return (
    <ReactSelect
      isSearchable={false}
      isClearable={false}
      size="md"
      menuPlacement="top"
      placeholder=""
      className="max-w-44"
      // value={current}
      value={handleSelected(options, current)}
      disabled={pending || options.length < 2}
      onChange={event => {
        const siteId = (event as Option).value;
        startTransition(async () => {
          await switchSite(siteId);
          router.refresh();
        });
      }}
      options={options}
    />
  );
}
