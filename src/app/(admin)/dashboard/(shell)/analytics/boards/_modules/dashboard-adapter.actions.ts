'use server';

/**
 * Server actions behind the dashboard builder's adapters (B15 E8): load and
 * version-checked save for storage, the source list and one batched,
 * structured query endpoint for data. Input and output follow the Zod
 * contracts in `@nextcms/builder-react/dashboard`.
 */

import {
  type DashboardQueryResponse,
  type DashboardRecord,
  type DashboardSaveResult,
  type DashboardSource,
} from '@nextcms/builder-react/dashboard';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import {
  toBoardLayout,
  toDashboardRecord,
} from '@/lib/analytics/dashboard-bridge';
import { ApplicationException } from '@/lib/utils/error';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { analyticsDashboardDataService } from '@/server/services/analytics-dashboard-data.service';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import {
  saveDashboardRecordSchema,
  listDashboardSourcesSchema,
  queryDashboardWidgetsSchema,
} from './dashboard-adapter.schemas';
import { idSchema } from '@/schemas/shared';

const boardsBase = PAGES.DASHBOARD.ANALYTICS_BOARDS;

export const loadDashboardRecord = accessProcedure
  .input(idSchema)
  .action(async ({ input }): Promise<DashboardRecord> => {
    const board = await analyticsBoardsService.get(input.id);
    if (!board) throw new ApplicationException('Dashboard not found');
    return toDashboardRecord(board);
  });

export const saveDashboardRecord = accessProcedure
  .input(saveDashboardRecordSchema)
  .action(async ({ input }): Promise<DashboardSaveResult> => {
    const mapped = toBoardLayout(input.layout);
    if (!mapped.ok) throw new ApplicationException(mapped.message);

    const result = await analyticsBoardsService.saveVersioned(
      input.id,
      { name: input.name, layout: mapped.layout },
      input.expectedVersion
    );
    if (!result) throw new ApplicationException('Dashboard not found');
    if (result.status === 'conflict') {
      return { status: 'conflict', current: toDashboardRecord(result.current) };
    }

    revalidatePath(boardsBase);
    revalidatePath(`${boardsBase}/${input.id}`);
    return {
      status: 'saved',
      version: result.version,
      updatedAt: result.updatedAt.toISOString(),
    };
  });

export const listDashboardSources = accessProcedure
  .input(listDashboardSourcesSchema)
  .action(async (): Promise<DashboardSource[]> =>
    analyticsDashboardDataService.sources()
  );

/** The structured query endpoint: a batch of requests, never SQL. */
export const queryDashboardWidgets = accessProcedure
  .input(queryDashboardWidgetsSchema)
  .action(async ({ input }): Promise<DashboardQueryResponse[]> =>
    analyticsDashboardDataService.query(input.requests)
  );
