import 'server-only';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import type { SearchParams } from '@/db/helpers/parse-search-params';
import type { PromiseResult } from '@/lib/types';
import { protectedProcedure } from '@/server/procedures/protected.procedure';

export const pageQueries = {
  getById: protectedProcedure.query(({ params }: { params: { id: string } }) =>
    pagesServices.getById(params)
  ),
  getPaginated: protectedProcedure.query(
    ({ params }: { params: SearchParams }) => pagesServices.getPaginated(params)
  ),
  getStatusCounts: protectedProcedure.query(() =>
    pagesServices.getStatusCounts()
  ),
};

export type GetPage = PromiseResult<typeof pageQueries.getById>;
