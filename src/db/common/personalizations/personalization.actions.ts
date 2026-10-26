'use server';

import { personalizationService } from '@/db/common/personalizations/personalization.service';
import {
  createPersonalizedSectionSchema,
  updatePersonalizedSectionSchema,
} from '@/db/validation';
import { protectedProcedure } from '@/server/procedures/protected.procedure';

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
