import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import { globalBlocks, overlayStats } from '@/db/schema';
import { validateRequest } from '@/server/actions/auth.actions';
import { getPreviewSession } from '@/server/services/preview-session';

const eventSchema = z.object({
  type: z.enum(['view', 'close', 'conversion']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing overlay id' }, { status: 400 });
    }

    // Parse and validate body
    let rawBody: unknown;

    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = eventSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event type', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { type } = parsed.data;

    // Check preview session: do not record stats for draft / preview previews
    const preview = await getPreviewSession().catch(() => null);

    if (preview) {
      return NextResponse.json({ ok: true, skipped: 'preview' });
    }

    // Check logged-in admin: do not record stats for admin users browsing the site
    const session = await validateRequest().catch(() => null);

    if (session?.user) {
      return NextResponse.json({ ok: true, skipped: 'logged-in' });
    }

    // Check that the overlay exists and is published
    const [overlay] = await db
      .select({
        id: globalBlocks.id,
        siteId: globalBlocks.siteId,
        publishedAt: globalBlocks.publishedAt,
        category: globalBlocks.category,
      })
      .from(globalBlocks)
      .where(eq(globalBlocks.id, id))
      .limit(1);

    if (
      !overlay ||
      !overlay.publishedAt ||
      (overlay.category !== 'Popup' && overlay.category !== 'Drawer')
    ) {
      return NextResponse.json(
        { error: 'Overlay not found or unpublished' },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    // Upsert daily counter
    await db
      .insert(overlayStats)
      .values({
        id: createId(),
        overlayId: overlay.id,
        siteId: overlay.siteId,
        day: today,
        views: type === 'view' ? 1 : 0,
        closes: type === 'close' ? 1 : 0,
        conversions: type === 'conversion' ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [overlayStats.overlayId, overlayStats.day],
        set: {
          views:
            type === 'view'
              ? sql`${overlayStats.views} + 1`
              : overlayStats.views,
          closes:
            type === 'close'
              ? sql`${overlayStats.closes} + 1`
              : overlayStats.closes,
          conversions:
            type === 'conversion'
              ? sql`${overlayStats.conversions} + 1`
              : overlayStats.conversions,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error recording overlay event:', error);
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    );
  }
}
