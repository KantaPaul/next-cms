'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { pages, pageContents, pageExperiments } from '@/db/schema';
import { ContentKindType } from '@/db/schemas/shared.schema';
import { permissionProcedure } from '@/server/procedures/permission.procedure';
import { PAGES } from '@/config/pages';

const revalidatePage = (id: string) => {
  revalidatePath(PAGES.DASHBOARD.PAGES.EDIT(id));
};

/** Start or update an A/B experiment on a published builder page. Requires pages.publish. */
export const startPageExperiment = permissionProcedure('pages.publish')
  .input(
    z.object({
      pageId: z.string(),
      variantContent: z.string(),
      weight: z.number().min(1).max(99).default(50),
    })
  )
  .action(async ({ input, ctx }) => {
    const [page] = await db
      .select({
        id: pages.id,
        status: pages.status,
        editorType: pages.editorType,
      })
      .from(pages)
      .where(eq(pages.id, input.pageId))
      .limit(1);

    if (!page) {
      return { ok: false, error: 'page_not_found' };
    }
    if (page.status !== 'published') {
      return { ok: false, error: 'page_not_published' };
    }
    if (page.editorType !== 'builder') {
      return { ok: false, error: 'page_not_builder' };
    }

    let variantContent: unknown;
    try {
      variantContent = JSON.parse(input.variantContent);
    } catch {
      return { ok: false, error: 'invalid_variant_content' };
    }

    const [existing] = await db
      .select({ id: pageExperiments.id })
      .from(pageExperiments)
      .where(eq(pageExperiments.pageId, input.pageId))
      .limit(1);

    if (existing) {
      await db
        .update(pageExperiments)
        .set({
          variantContent,
          weight: input.weight,
          status: 'running',
          updatedAt: new Date(),
        })
        .where(eq(pageExperiments.id, existing.id));
    } else {
      await db.insert(pageExperiments).values({
        id: `${input.pageId}:experiment`,
        pageId: input.pageId,
        variantContent,
        weight: input.weight,
        status: 'running',
      });
    }

    revalidatePage(input.pageId);
    return { ok: true };
  });

/** Pick a winner for a page experiment. Requires pages.publish. */
export const pickPageExperimentWinner = permissionProcedure('pages.publish')
  .input(
    z.object({
      pageId: z.string(),
      winner: z.enum(['a', 'b']),
    })
  )
  .action(async ({ input, ctx }) => {
    const [experiment] = await db
      .select()
      .from(pageExperiments)
      .where(eq(pageExperiments.pageId, input.pageId))
      .limit(1);

    if (!experiment) {
      return { ok: false, error: 'experiment_not_found' };
    }
    if (experiment.status !== 'running') {
      return { ok: false, error: 'experiment_not_running' };
    }

    const winner = input.winner;

    if (winner === 'b') {
      await db
        .insert(pageContents)
        .values({
          pageId: input.pageId,
          kind: 'published',
          content: experiment.variantContent as object,
        })
        .onConflictDoUpdate({
          target: [pageContents.pageId, pageContents.kind],
          set: {
            content: experiment.variantContent as object,
            updatedAt: new Date(),
          },
        });
    }

    await db
      .update(pageExperiments)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(eq(pageExperiments.id, experiment.id));

    revalidatePage(input.pageId);
    return { ok: true, winner };
  });

/** End a page experiment without picking a winner. Requires pages.publish. */
export const endPageExperiment = permissionProcedure('pages.publish')
  .input(
    z.object({
      pageId: z.string(),
    })
  )
  .action(async ({ input, ctx }) => {
    await db
      .update(pageExperiments)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(eq(pageExperiments.pageId, input.pageId));

    revalidatePage(input.pageId);
    return { ok: true };
  });
