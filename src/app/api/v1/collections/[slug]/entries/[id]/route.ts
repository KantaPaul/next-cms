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

const updateEntrySchema = z.object({
  slug: z.string().trim().min(1).max(200).optional(),
  data: z.unknown().optional(),
});

export const dynamic = 'force-dynamic';

export const PATCH = apiHandler(
  async (request, { params }) => {
    const { slug: collectionSlug, id: entryId } = await params;
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApiRequestError(403, 'Missing pages.edit permission.');
    }

    const site = await siteContext.publicSite();
    const body = await request.json();
    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(400, 'Invalid update data.');
    }

    const collection = await collectionsService.getBySlug(collectionSlug);
    if (collection.siteId !== site.id) {
      throw new ApiRequestError(404, 'Collection not found.');
    }

    const [existing] = await db
      .select()
      .from(collectionEntries)
      .where(eq(collectionEntries.id, entryId))
      .limit(1);
    if (!existing || existing.collectionId !== collection.id) {
      throw new ApiRequestError(404, 'Entry not found.');
    }

    const fields = await collectionsService.getFields(collection.id);
    const values: Record<string, unknown> = {};
    if (parsed.data.slug !== undefined) values.slug = parsed.data.slug;
    if (parsed.data.data !== undefined) {
      const { data, error } = parseEntryData(
        fields,
        parsed.data.data
      );
      if (error) {
        throw new ApiRequestError(400, `Invalid entry data: ${error.message}`);
      }
      values.data = data;
    }

    const [entry] = await db
      .update(collectionEntries)
      .set(values)
      .where(eq(collectionEntries.id, entryId))
      .returning();

    return NextResponse.json({ id: entry.id, status: entry.status });
  },
  ['content:write']
);

export const OPTIONS = async () => {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
};
