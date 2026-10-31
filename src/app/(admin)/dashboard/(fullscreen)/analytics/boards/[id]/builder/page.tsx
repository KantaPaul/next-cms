import { notFound } from 'next/navigation';
import {
  BOARD_MAX_WIDGETS,
  BOARD_WIDGET_SPANS,
  toDashboardRecord,
} from '@/lib/analytics/dashboard-bridge';
import { metaObject } from '@/lib/utils/metadata';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { DashboardBuilderClient } from './dashboard-builder-client';

export const metadata = metaObject('Dashboard builder');

/**
 * Analytics board on the shared dashboard builder (B15 E8). The board is
 * loaded here, so the editor opens without a first request; sources,
 * widget data and saves go through the real adapters. The old board
 * editor stays at `/edit`.
 */
export default async function DashboardBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await analyticsBoardsService.get(id);
  if (!board) notFound();
  return (
    <DashboardBuilderClient
      initial={toDashboardRecord(board)}
      spanOptions={BOARD_WIDGET_SPANS}
      maxWidgets={BOARD_MAX_WIDGETS}
    />
  );
}
