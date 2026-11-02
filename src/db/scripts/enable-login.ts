#!/usr/bin/env tsx
/**
 * Enables login on the CMS through direct database access (R284 / A7-01).
 *
 * Usage:
 *   npm run auth:enable-login
 *   npx tsx src/db/scripts/enable-login.ts
 *
 * Security:
 *   - Runs exclusively via CLI using DATABASE_URL.
 *   - Does not expose or listen on any HTTP route.
 *   - Allows an administrator who locked themselves out to recover login access.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { siteSettings, SITE_SETTINGS_ID, DEFAULT_AUTH_SETTINGS, type AuthSettings } from '@/db/schema';

async function main() {
  const [settings] = await db
    .select()
    .from(siteSettings)
    .limit(1);

  if (!settings) {
    // Insert default settings with loginEnabled = true
    await db.insert(siteSettings).values({
      id: SITE_SETTINGS_ID,
      siteId: 'default',
      authSettings: {
        ...DEFAULT_AUTH_SETTINGS,
        loginEnabled: true,
      },
    });
    console.log('Success: Default site settings created and login has been enabled.');
    process.exit(0);
  }

  const currentAuth = (settings.authSettings as AuthSettings) || DEFAULT_AUTH_SETTINGS;
  const updatedAuth: AuthSettings = {
    ...currentAuth,
    loginEnabled: true,
  };

  await db
    .update(siteSettings)
    .set({
      authSettings: updatedAuth,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, settings.id));

  console.log('Success: Login has been re-enabled in site settings.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error enabling login:', err);
  process.exit(1);
});
