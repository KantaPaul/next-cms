'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { adminSiteId } from '@/server/services/site-context';
import { headerFooterService } from './header-footer.service';
import { templateResolverService } from '@/server/services/template-resolver.service';
import { collectionsService } from '@/server/services/collections.service';
import { taxonomyService } from '@/app/(admin)/dashboard/(shell)/taxonomy/_modules/taxonomy.service';

export const createHeaderFooter = accessProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(150),
      category: z.enum(['Header', 'Footer', 'Search', 'Archive', 'MegaMenu']),
      starter: z.string().optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.create(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const duplicateHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.duplicate(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const renameHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(150),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.rename(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const deleteHeaderFooter = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.delete(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const getDisplayRules = accessProcedure
  .input(z.object({ templateId: z.string().min(1) }))
  .action(async ({ input }) => {
    const siteId = await adminSiteId();
    return templateResolverService.getRulesForTemplate(
      siteId,
      input.templateId
    );
  });

export const saveDisplayRules = accessProcedure
  .input(
    z.object({
      templateId: z.string().min(1),
      area: z.enum(['header', 'footer', 'search', 'archive']),
      rules: z.array(
        z.object({
          kind: z.enum([
            'post-type',
            'category',
            'tag',
            'user-state',
            'role',
            'archive-type',
            'search-kind',
          ]),
          value: z.string().min(1),
          priority: z.number().default(0),
        })
      ),
    })
  )
  .action(async ({ input }) => {
    const siteId = await adminSiteId();
    const rows = await templateResolverService.saveRulesForTemplate(
      siteId,
      input.templateId,
      input.area,
      input.rules
    );
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    await revalidatePublicSite(siteId);
    // Wrapped so an empty rule list still counts as success client-side.
    return { saved: rows.length };
  });

export const getDisplayRulesTaxonomy = accessProcedure.action(async () => {
  const [categories, tags, postTypes] = await Promise.all([
    taxonomyService.listCategories(),
    taxonomyService.listTags(),
    collectionsService.list().catch(() => []),
  ]);
  return {
    categories,
    tags,
    postTypes: postTypes.map(c => ({ label: c.name, value: c.slug })),
  };
});
