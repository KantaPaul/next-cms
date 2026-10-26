import 'dotenv/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from '@/db/schema';

type TEnv = 'development' | 'production' | 'test';
type Database = NodePgDatabase<typeof schema>;

/** Get environment configuration */
const getEnvConfig = () => {
  const DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres';
  const NODE_ENV = (process.env.NODE_ENV || 'development') as TEnv;

  return { DATABASE_URL, NODE_ENV };
};

/** Create pg.Pool config based on environment */
const createPoolConfig = (env: TEnv, url: string): PoolConfig => ({
  connectionString: url,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

/** Create Drizzle connection */
const createDrizzleConnection = (): Database => {
  try {
    const { NODE_ENV, DATABASE_URL } = getEnvConfig();
    const pool = new Pool(createPoolConfig(NODE_ENV, DATABASE_URL));
    pool.on('error', (err: Error) =>
      console.warn('[AI Studio] Database pool notice:', err?.message || err)
    );
    return drizzle(pool, { schema, logger: false, casing: 'snake_case' });
  } catch {
    console.warn('[AI Studio] Database not connected — fallback active');
    const noOp: any = {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => null,
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {},
      delete: async () => ({}),
    };
    return new Proxy({} as Database, {
      get: (_, prop) =>
        prop === 'query' ? new Proxy({}, { get: () => noOp }) : async () => [],
    });
  }
};

/** Singleton Database Manager */
class DatabaseManager {
  private static instance: ReturnType<typeof createDrizzleConnection> | null =
    null;

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = createDrizzleConnection();
    return this.instance;
  }

  static async shutdown() {
    const client = (this.instance as { $client?: Pool } | null)?.$client;
    if (client instanceof Pool) {
      await client
        .end()
        .catch((err: Error) =>
          console.error('Error closing database pool:', err)
        );
      this.instance = null;
    }
  }
}

/** Setup graceful shutdown handlers */
const setupShutdownHandlers = () => {
  ['SIGTERM', 'SIGINT', 'SIGUSR2', 'SIGQUIT'].forEach(signal =>
    process.once(signal, async () => {
      await DatabaseManager.shutdown();
      console.info('Database connections closed');
      process.exit(signal === 'SIGQUIT' ? 1 : 0);
    })
  );
};

setupShutdownHandlers();

/** Hot-reload safe export for development */
declare global {
  var __db__: ReturnType<typeof DatabaseManager.getInstance> | undefined;
}

export const db = global.__db__ ?? DatabaseManager.getInstance();
if (process.env.NODE_ENV !== 'production') global.__db__ = db;

export default db;
