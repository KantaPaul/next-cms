'use client';

import { DashboardBuilder, type DashboardRecord } from '@nextcms/builder-react';
import '@nextcms/editor-ui/editor-ui.css';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { PAGES } from '@/config/pages';
import { createBoardDashboardAdapters } from '@/app/(admin)/dashboard/(shell)/analytics/boards/_modules/dashboard-adapters';

export function DashboardBuilderClient({
  initial,
  spanOptions,
  maxWidgets,
}: {
  initial: DashboardRecord;
  spanOptions: number[];
  maxWidgets: number;
}) {
  const router = useRouter();
  const adapters = useMemo(() => createBoardDashboardAdapters(), []);
  return (
    <DashboardBuilder
      dashboardId={initial.id}
      adapters={adapters}
      initial={initial}
      spanOptions={spanOptions}
      maxWidgets={maxWidgets}
      breadcrumb={[
        {
          label: 'Dashboards',
          onSelect: () => router.push(PAGES.DASHBOARD.ANALYTICS_BOARDS),
        },
      ]}
    />
  );
}
