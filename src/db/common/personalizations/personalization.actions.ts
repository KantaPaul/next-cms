'use server';

import { protectedProcedure } from '@/server/procedures/protected.procedure';
import { personalizationService } from '@/db/common/personalizations/personalization.service';
import { createPersonalizedSectionSchema, updatePersonalizedSectionSchema } from '@/db/validation';

export const createPersonalizedSection = protectedProcedure
  .input(createPersonalizedSectionSchema)
  .action(async ({ input, ctx }) => {
    await personalizationService.createSection({ ...input, ...ctx.user });
  });
export const updatePersonalizedSection = protectedProcedure
  .input(updatePersonalizedSectionSchema)
  .action(async ({ input, ctx }) => {
    await personalizationService.updateSection({ ...input, ...ctx.user });
  });
