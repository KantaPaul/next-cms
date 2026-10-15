import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from '@/db/schema';

type TEnv = 'development' | 'production' | 'test';

/** Get environment configuration */
const getEnvConfig = () => {
  const DATABASE_URL = process.env.DATABASE_URL;
  const NODE_ENV = (process.env.NODE_ENV || 'development') as TEnv;

  if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

  return { DATABASE_URL, NODE_ENV };
};

/** Create pg.Pool config based on environment */
const createPoolConfig = (env: TEnv, url: string): PoolConfig => ({
  connectionString: url,
  max: 10,
  idleTimeoutMillis: 30000, // close idle clients after 30s
  // Also bounds the wait for a free pooled client; dev compiles can stall requests for several seconds.
  connectionTimeoutMillis: env === 'production' ? 5000 : 15000,
  statement_timeout: 30000, // optional, prevent long queries
  // ssl: env === 'production' ? { rejectUnauthorized: true } : undefined,
});

/** Create Drizzle connection */
const createDrizzleConnection = () => {
  const { NODE_ENV, DATABASE_URL } = getEnvConfig();

  const pool = new Pool(createPoolConfig(NODE_ENV, DATABASE_URL));

  pool.on('error', (err) => console.error('Database pool error:', err));

  return drizzle(pool, { schema, logger: false, casing: 'snake_case' });
};

/** Singleton Database Manager */
class DatabaseManager {
  private static instance: ReturnType<typeof createDrizzleConnection> | null = null;

  private constructor() {}

  static getInstance() {
    if (!this.instance) this.instance = createDrizzleConnection();
    return this.instance;
  }

  static async shutdown() {
    if (this.instance?.$client instanceof Pool) {
      await this.instance.$client
        .end()
        .catch((err) => console.error('Error closing database pool:', err));
      this.instance = null;
    }
  }
}

/** Setup graceful shutdown handlers */
const setupShutdownHandlers = () => {
  ['SIGTERM', 'SIGINT', 'SIGUSR2', 'SIGQUIT'].forEach((signal) =>
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
