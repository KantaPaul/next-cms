'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { clientIp } from '@/server/lib/client-ip';
import { allowVisitorListingCall } from '@/server/lib/external-api-rate-limit';
import { accessService } from '@/server/services/access.service';
import { externalApiRecordsService } from '@/server/services/external-api-records.service';
import { siteContext } from '@/server/services/site-context';

const inputSchema = z.object({
  presetIds: z.array(z.string().min(1).max(64)).max(10),
  itemId: z.string().trim().max(200).optional(),
  /** Editor/preview render: uses the admin's site, only for signed-in editors. */
  draft: z.boolean().optional(),
});

/**
 * Records for "External API Item" dynamic bindings, by preset id. Called
 * while rendering (block loaders). Public like the listing action, so it is
 * rate limited per visitor IP and only reads the current site's presets.
 */
export async function loadExternalApiRecords(rawInput: z.input<typeof inputSchema>) {
  const input = inputSchema.parse(rawInput);
  if (input.presetIds.length === 0) return {};

  if (input.draft) {
    const session = await validateSession();
    if (session) {
      const access = await accessService.getUserAccess(session.user.id);
      if (accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
        const site = await siteContext.adminSite(session.user.id);
        return externalApiRecordsService.load(input.presetIds, site, input.itemId);
      }
    }
  }

  if (!(await allowVisitorListingCall(clientIp(await headers())))) return {};
  const site = await siteContext.publicSite();
  return externalApiRecordsService.load(input.presetIds, site, input.itemId);
}
