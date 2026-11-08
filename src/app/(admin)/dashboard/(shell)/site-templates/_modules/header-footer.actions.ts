'use server';

import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import { accessProcedure } from '@/server/procedures/permission.procedure';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { adminSiteId } from '@/server/services/site-context';
import { headerFooterService } from './header-footer.service';
import { templateResolverService } from '@/server/services/template-resolver.service';
import { collectionsService } from '@/server/services/collections.service';
import { taxonomyService } from '@/app/(admin)/dashboard/(shell)/taxonomy/_modules/taxonomy.service';
import {
  createHeaderFooterSchema,
  duplicateHeaderFooterSchema,
  renameHeaderFooterSchema,
  deleteHeaderFooterSchema,
  getDisplayRulesSchema,
  saveDisplayRulesSchema,
} from './header-footer.schemas';

export const createHeaderFooter = accessProcedure
  .input(createHeaderFooterSchema)
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.create(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const duplicateHeaderFooter = accessProcedure
  .input(duplicateHeaderFooterSchema)
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.duplicate(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const renameHeaderFooter = accessProcedure
  .input(renameHeaderFooterSchema)
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.rename(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const deleteHeaderFooter = accessProcedure
  .input(deleteHeaderFooterSchema)
  .action(async ({ input, ctx }) => {
    const row = await headerFooterService.delete(input, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    await revalidatePublicSite(siteId);
    return row;
  });

export const getDisplayRules = accessProcedure
  .input(getDisplayRulesSchema)
  .action(async ({ input }) => {
    const siteId = await adminSiteId();
    return templateResolverService.getRulesForTemplate(
      siteId,
      input.templateId
    );
  });

export const saveDisplayRules = accessProcedure
  .input(saveDisplayRulesSchema)
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
