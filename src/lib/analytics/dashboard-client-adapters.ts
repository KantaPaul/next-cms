/**
 * Dashboard builder adapters for the CMS (B15 E8): each call goes to a
 * server action (`boards/_modules/dashboard-adapter.actions.ts`), turns an
 * action error into a thrown Error, and checks the answer against the
 * adapter contract before the builder sees it. The actions are passed in,
 * so contract tests can run this code without a request or a database.
 */

import {
  type DashboardAdapters,
  type DashboardLayout,
  type DashboardQueryRequest,
  dashboardQueryResponseSchema,
  dashboardRecordSchema,
  dashboardSaveResultSchema,
  dashboardSourceSchema,
} from '@nextcms/builder-react/dashboard';
import { z } from 'zod';

export type DashboardActions = {
  load: (input: { id: string }) => Promise<unknown>;
  save: (input: {
    id: string;
    name: string;
    layout: DashboardLayout;
    expectedVersion: number;
  }) => Promise<unknown>;
  listSources: (input: Record<string, never>) => Promise<unknown>;
  query: (input: { requests: DashboardQueryRequest[] }) => Promise<unknown>;
};

/** Server actions return `{ hasError, message }` or `{ errors }` instead of throwing. */
function unwrap(value: unknown): unknown {
  if (value && typeof value === 'object') {
    if ('hasError' in value && value.hasError) {
      const message = 'message' in value ? String(value.message) : '';
      throw new Error(message || 'Request failed');
    }
    if ('errors' in value && value.errors && typeof value.errors === 'object') {
      const first = Object.values(value.errors as Record<string, string[]>)[0];
      throw new Error(first?.[0] ?? 'Invalid request');
    }
  }
  return value;
}

export function createDashboardAdapters(
  actions: DashboardActions
): DashboardAdapters {
  return {
    storage: {
      load: async id =>
        dashboardRecordSchema.parse(unwrap(await actions.load({ id }))),
      save: async (id, input, expectedVersion) =>
        dashboardSaveResultSchema.parse(
          unwrap(
            await actions.save({
              id,
              name: input.name,
              layout: input.layout,
              expectedVersion,
            })
          )
        ),
    },
    data: {
      listSources: async () =>
        z
          .array(dashboardSourceSchema)
          .parse(unwrap(await actions.listSources({}))),
      query: async requests => {
        if (requests.length === 0) return [];
        return z
          .array(dashboardQueryResponseSchema)
          .parse(unwrap(await actions.query({ requests })));
      },
    },
  };
}
