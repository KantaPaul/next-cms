import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type {
  NodePgDatabase,
  NodePgQueryResultHKT,
} from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from '@/db/schema';

export type DBTransaction =
  | PgTransaction<
      NodePgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >
  | NodePgDatabase<typeof schema>;

export type DBConnection = NodePgDatabase<typeof schema>;

export type DBTrx = DBConnection | DBTransaction;
