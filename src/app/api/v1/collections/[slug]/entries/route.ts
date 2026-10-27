import { z } from 'zod';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { collectionEntries, collections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiHandler, ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { siteContext } from '@/server/services/site-context';
import {
  collectionsService,
  parseEntryData,
} from '@/server/services/collections.service';

const createEntrySchema = z.object({
  slug: z.string().trim().min(1).max(200),
  data: z.unknown(),
});

export const dynamic = 'force-dynamic';

export const POST = apiHandler(
  async (request, { params }) => {
    const { slug: collectionSlug } = await params;
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApiRequestError(403, 'Missing pages.create permission.');
    }

    const site = await siteContext.publicSite();
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid entry data.');
    }

    const collection = await collectionsService.getBySlug(collectionSlug);
    // getBySlug uses adminSiteId, but API should use key's siteId
    // Re-verify the collection belongs to the key's site
    if (collection.siteId !== site.id) {
      throw new ApiRequestError(404, 'Collection not found.');
    }

    const fields = await collectionsService.getFields(collection.id);
    const { data, error } = parseEntryData(
      fields,
      parsed.data.data
    );
    if (error) {
      throw new ApiRequestError(400, `Invalid entry data: ${error.message}`);
    }

    const [entry] = await db
      .insert(collectionEntries)
      .values({
        siteId: site.id,
        collectionId: collection.id,
        slug: parsed.data.slug,
        status: 'draft',
        data,
      })
      .returning();

    return NextResponse.json({ id: entry.id, status: entry.status });
  },
  ['content:write']
);

export const OPTIONS = async () => {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
};
