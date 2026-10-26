import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  introspect: {
    casing: 'camel',
  },
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: 'ledgerly_migrations',
    schema: 'public',
    prefix: 'timestamp',
  },
});
