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
  dashboardLayoutSchema,
  dashboardQueryBatchSchema,
} from '@nextcms/builder-react/dashboard';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import {
  toBoardLayout,
  toDashboardRecord,
} from '@/lib/analytics/dashboard-bridge';
import { ApplicationException } from '@/lib/utils/error';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { analyticsDashboardDataService } from '@/server/services/analytics-dashboard-data.service';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';

const boardsBase = PAGES.DASHBOARD.ANALYTICS_BOARDS;

export const loadDashboardRecord = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }): Promise<DashboardRecord> => {
    const board = await analyticsBoardsService.get(input.id);
    if (!board) throw new ApplicationException('Dashboard not found');
    return toDashboardRecord(board);
  });

export const saveDashboardRecord = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(120),
      layout: dashboardLayoutSchema,
      expectedVersion: z.number().int().min(0),
    })
  )
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
  .input(z.object({}))
  .action(async (): Promise<DashboardSource[]> =>
    analyticsDashboardDataService.sources()
  );

/** The structured query endpoint: a batch of requests, never SQL. */
export const queryDashboardWidgets = accessProcedure
  .input(z.object({ requests: dashboardQueryBatchSchema }))
  .action(async ({ input }): Promise<DashboardQueryResponse[]> =>
    analyticsDashboardDataService.query(input.requests)
  );
