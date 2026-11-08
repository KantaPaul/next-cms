import { z } from 'zod';
import {
  dashboardLayoutSchema,
  dashboardQueryBatchSchema,
} from '@nextcms/builder-react/dashboard';

export const saveDashboardRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  layout: dashboardLayoutSchema,
  expectedVersion: z.number().int().min(0),
});

export const listDashboardSourcesSchema = z.object({});

export const queryDashboardWidgetsSchema = z.object({
  requests: dashboardQueryBatchSchema,
});
