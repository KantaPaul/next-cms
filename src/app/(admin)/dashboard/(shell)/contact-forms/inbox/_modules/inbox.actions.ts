'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { formsService } from '@/server/services/forms.service';

export const archiveSubmission = permissionProcedure(PERMISSIONS.PAGES_EDIT)
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input }) => {
    const row = await formsService.archive(input.id);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS_INBOX);
    return row;
  });
