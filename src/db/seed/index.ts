/**
 * Idempotent seed: roles and permissions, site settings, starter templates, and global blocks.
 * Run with `pnpm db:seed`.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  globalBlocks,
  pageTemplates,
  SITE_SETTINGS_ID,
  siteSettings,
  sites,
} from '@/db/schema';
import { DEFAULT_SITE_LOCALES } from '@/db/schemas/sites.schema';
import { accessService } from '@/server/services/access.service';
import { STARTER_GLOBAL_BLOCKS, STARTER_TEMPLATES } from './starter-content';

async function main() {
  const roles = await accessService.ensureRolesSeeded();
  console.info(`Roles: ${roles.map(r => r.name).join(', ')}`);

  await db
    .insert(sites)
    .values({
      id: SITE_SETTINGS_ID,
      name: 'Next CMS',
      defaultLocale: 'en',
      locales: DEFAULT_SITE_LOCALES,
    })
    .onConflictDoNothing();
  await db
    .insert(siteSettings)
    .values({ id: SITE_SETTINGS_ID, siteId: SITE_SETTINGS_ID })
    .onConflictDoNothing();
  console.info('Site settings: ok');

  for (const template of STARTER_TEMPLATES) {
    const { key: _key, ...values } = template;
    const [existing] = await db
      .select({ id: pageTemplates.id })
      .from(pageTemplates)
      .where(
        and(
          eq(pageTemplates.name, values.name),
          eq(pageTemplates.isSystem, true)
        )
      );

    if (existing) {
      await db
        .update(pageTemplates)
        .set({ ...values, content: values.content as object })
        .where(eq(pageTemplates.id, existing.id));
    } else {
      await db
        .insert(pageTemplates)
        .values({
          ...values,
          content: values.content as object,
          isSystem: true,
        });
    }
  }
  console.info(`Templates: ${STARTER_TEMPLATES.length}`);

  for (const block of STARTER_GLOBAL_BLOCKS) {
    const [existing] = await db
      .select({ id: globalBlocks.id })
      .from(globalBlocks)
      .where(eq(globalBlocks.name, block.name));
    if (!existing)
      await db
        .insert(globalBlocks)
        .values({ ...block, content: block.content as object });
  }
  console.info(`Global blocks: ${STARTER_GLOBAL_BLOCKS.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
