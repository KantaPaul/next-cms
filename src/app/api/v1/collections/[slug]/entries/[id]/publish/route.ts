import { NextResponse } from 'next/server';
import { db } from '@/db';
import { collectionEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiHandler, ApiRequestError } from '@/server/api/v1';
import { PERMISSIONS } from '@/config/permissions';
import { accessService } from '@/server/services/access.service';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { siteContext } from '@/server/services/site-context';
import { doAction } from '@/server/plugins/hooks';

export const dynamic = 'force-dynamic';

export const POST = apiHandler<{ slug: string; id: string }>(
  async (request, { params }) => {
    const { slug: collectionSlug, id: entryId } = params;
    const { userId } = await getCurrentUserAndTeamId();
    const access = await accessService.getUserAccess(userId);
    if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
      throw new ApiRequestError(403, 'Missing pages.publish permission.');
    }

    const site = await siteContext.publicSite();

    const collection = await db
      .select()
      .from(collectionEntries)
      .where(eq(collectionEntries.id, entryId))
      .limit(1);
    const [entry] = collection;
    if (!entry || entry.siteId !== site.id) {
      throw new ApiRequestError(404, 'Entry not found.');
    }

    await db
      .update(collectionEntries)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(collectionEntries.id, entryId));

    await doAction('entry.changed', {
      id: entryId,
      type: 'entry',
      collectionId: entry.collectionId,
      slug: entry.slug,
      action: 'published',
      siteId: site.id,
      actorId: userId,
    });

    return NextResponse.json({ id: entryId, status: 'published' });
  },
  ['content:write']
);

export const OPTIONS = async () => {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
};
