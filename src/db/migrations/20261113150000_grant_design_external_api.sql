-- Admins on existing installs get the two permissions added in 4dd4956
-- (design.manage, external_api.manage). New installs get them from
-- PERMISSION_MATRIX via ensureRolesSeeded.
INSERT INTO "permissions" ("id", "role_id", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, "id", 'design', 'manage', true
FROM "roles"
WHERE "name" = 'Admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permissions" ("id", "role_id", "resource", "action", "allowed")
SELECT gen_random_uuid()::text, "id", 'external_api', 'manage', true
FROM "roles"
WHERE "name" = 'Admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
