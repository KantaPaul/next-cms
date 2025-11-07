"use server";
import { PAGES } from "@/config/pages";
import { protectedProcedure } from "@/server/procedures/protected.procedure";
import { revalidatePath } from "next/cache";
import { pagesServices } from "@/app/(admin)/dashboard/pages/_modules/pages.service";
import {
  createPagesSchema,
  updatePagesSchema,
} from '@/app/(admin)/dashboard/pages/_modules/pages.validation';


export const createPages = protectedProcedure
  .input(createPagesSchema)
  .action(async ({ input, ctx }) => {
    const created = await pagesServices.create({ ...input, ...ctx.user });
    revalidatePath(PAGES.DASHBOARD.PAGES.INDEX);
    return created;
  });

export const updatePages = protectedProcedure
  .input(updatePagesSchema)
  .action(async ({ input, ctx }) => {
    const updated = await pagesServices.update({
      ...input,
      ...ctx.user,
    });
    revalidatePath(PAGES.DASHBOARD.PAGES.INDEX);
    return updated;
  });

// export const deleteHealthAndSafetyIncident = protectedProcedure
//   .input(updateHealthAndSafetyIncidentsSchema)
//   .action(async ({ input, ctx }) => {
//     revalidatePath(PAGES.DASHBOARD.HRM.HEALTH_SAFETY.INCIDENTS.INDEX);
//     return healthAndSafetyIncidentServices.delete({ ...input, ...ctx.user });
//   });
