import { protectedProcedure } from "@/server/procedures/protected.procedure";
import { pagesServices } from '@/app/(admin)/dashboard/pages/_modules/pages.service';
import type { PromiseResult } from "@/lib/types";

export const pageQueries = {
  getById: protectedProcedure.query(({ params, ctx }) => {
    return pagesServices.getById({ ...params, userId: ctx.user.userId });
  }),
};

export type GetHealthAndSafetyIncident = PromiseResult<typeof pageQueries.getById>;
