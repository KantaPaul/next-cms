/**
 * In-memory dashboard adapters (B15 E8) for standalone hosts and tests.
 * They follow the same contract as a real host (version check, per-request
 * errors, batch limit), so tests can run one contract suite against both.
 * The CMS never uses these; its adapters call server actions.
 */

import {
  checkDashboardQuery,
  DASHBOARD_QUERY_BATCH_LIMIT,
  type DashboardAdapters,
  type DashboardQuery,
  type DashboardRecord,
  type DashboardResult,
  type DashboardSource,
  dashboardQueryBatchSchema,
  dashboardSaveInputSchema,
} from './dashboard-adapters';

export type MemoryDashboardOptions = {
  records?: DashboardRecord[];
  sources: DashboardSource[];
  /** Answers one valid query at a resolved range in days. */
  run: (
    query: DashboardQuery,
    days: number
  ) => DashboardResult | Promise<DashboardResult>;
  now?: () => Date;
};

export function createMemoryDashboardAdapters(
  options: MemoryDashboardOptions
): DashboardAdapters {
  const now = options.now ?? (() => new Date());
  const records = new Map(
    (options.records ?? []).map(r => [r.id, structuredClone(r)])
  );

  return {
    storage: {
      load: async id => {
        const record = records.get(id);
        if (!record) throw new Error(`Dashboard ${id} not found`);
        return structuredClone(record);
      },
      save: async (id, input, expectedVersion) => {
        const record = records.get(id);
        if (!record) throw new Error(`Dashboard ${id} not found`);
        if (record.version !== expectedVersion) {
          return { status: 'conflict', current: structuredClone(record) };
        }
        const { name, layout } = dashboardSaveInputSchema.parse(input);
        const updatedAt = now().toISOString();
        records.set(id, {
          ...record,
          name,
          layout: structuredClone(layout),
          version: record.version + 1,
          updatedAt,
        });
        return { status: 'saved', version: record.version + 1, updatedAt };
      },
    },
    data: {
      listSources: async () => structuredClone(options.sources),
      query: async requests => {
        if (requests.length > DASHBOARD_QUERY_BATCH_LIMIT) {
          throw new Error(
            `At most ${DASHBOARD_QUERY_BATCH_LIMIT} queries per batch`
          );
        }
        const batch = dashboardQueryBatchSchema.parse(requests);
        return Promise.all(
          batch.map(async request => {
            const invalid = checkDashboardQuery(options.sources, request.query);
            if (invalid) {
              return {
                key: request.key,
                status: 'error' as const,
                code: 'invalid' as const,
                message: invalid,
              };
            }
            const days =
              request.query.range === 'inherit'
                ? request.range
                : request.query.range;
            try {
              return {
                key: request.key,
                status: 'ok' as const,
                result: await options.run(request.query, days),
                fetchedAt: now().toISOString(),
              };
            } catch (error) {
              return {
                key: request.key,
                status: 'error' as const,
                code: 'failed' as const,
                message:
                  error instanceof Error ? error.message : 'Query failed',
              };
            }
          })
        );
      },
    },
  };
}
