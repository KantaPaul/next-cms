#!/usr/bin/env tsx
/**
 * Promotes a user account to the Admin role (R267 / A2-04).
 *
 * Usage:
 *   npm run auth:promote -- user@example.com
 *   npx tsx src/db/scripts/promote-admin.ts user@example.com
 *
 * Security:
 *   - Runs exclusively via CLI using DATABASE_URL.
 *   - Does not expose or listen on any HTTP route.
 *   - Requires direct host/shell access to the deployment.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { roles, users, UserStatus } from '@/db/schema';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run auth:promote -- <email>');
    process.exit(1);
  }

  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'Admin'))
    .limit(1);

  if (!adminRole) {
    console.error('Error: "Admin" role not found in the database. Ensure roles are seeded.');
    process.exit(1);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    console.error(`Error: User with email "${email}" not found.`);
    process.exit(1);
  }

  await db
    .update(users)
    .set({
      roleId: adminRole.id,
      status: UserStatus.Active,
      approvedAt: user.approvedAt ?? new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`Success: User "${email}" has been promoted to Admin.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error promoting user:', err);
  process.exit(1);
});
