'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { formsService } from '@/server/services/forms.service';
import { idSchema } from '@/schemas/shared';

export const archiveSubmission = permissionProcedure(PERMISSIONS.PAGES_EDIT)
  .input(idSchema)
  .action(async ({ input }) => {
    const row = await formsService.archive(input.id);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS_INBOX);
    return row;
  });
