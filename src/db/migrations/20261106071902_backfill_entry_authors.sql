-- Collection entries created before authors were recorded: take the author
-- from the audit log's "create" event. Only fills empty authors.
UPDATE "collection_entries" AS e
SET "author_id" = a."actor_id"
FROM (
  SELECT DISTINCT ON ("target_id") "target_id", "actor_id"
  FROM "audit_logs"
  WHERE "target_type" = 'collection_entry'
    AND "action" = 'create'
    AND "actor_id" IS NOT NULL
  ORDER BY "target_id", "created_at" ASC
) AS a
WHERE e."id" = a."target_id"
  AND e."author_id" IS NULL
  AND EXISTS (SELECT 1 FROM "users" u WHERE u."id" = a."actor_id");
