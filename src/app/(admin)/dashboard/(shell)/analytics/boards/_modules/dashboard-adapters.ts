import type { DashboardAdapters } from '@nextcms/builder-react/dashboard';
import { createDashboardAdapters } from '@/lib/analytics/dashboard-client-adapters';
import {
  listDashboardSources,
  loadDashboardRecord,
  queryDashboardWidgets,
  saveDashboardRecord,
} from './dashboard-adapter.actions';

/** The dashboard builder's real adapters: analytics boards and page views (B15 E8). */
export function createBoardDashboardAdapters(): DashboardAdapters {
  return createDashboardAdapters({
    load: loadDashboardRecord,
    save: saveDashboardRecord,
    listSources: listDashboardSources,
    query: queryDashboardWidgets,
  });
}
