import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

export interface DbConnectionInfo {
  connectionString: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

export const DEFAULT_DOCKER_CONTAINER = process.env.DB_DOCKER_CONTAINER || 'nextcms_db';
export const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');

export function parseDatabaseUrl(rawUrl: string | undefined): DbConnectionInfo {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
  }
  const url = new URL(rawUrl);
  return {
    connectionString: rawUrl,
    host: url.hostname || 'localhost',
    port: url.port || '5432',
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    database: url.pathname.replace(/^\//, '') || 'postgres',
  };
}

export function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function hasBinary(name: string): boolean {
  const res = spawnSync('which', [name], { encoding: 'utf8' });
  return res.status === 0 && res.stdout.trim().length > 0;
}

export function isVersionMismatchError(stderr: string): boolean {
  return (
    /server version:/i.test(stderr) &&
    (/version mismatch/i.test(stderr) || /aborting because of server version mismatch/i.test(stderr))
  );
}

export async function getTableRowCounts(connectionString: string): Promise<Array<{ table: string; count: number }>> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tablesRes = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC`,
    );
    const counts: Array<{ table: string; count: number }> = [];
    for (const row of tablesRes.rows) {
      const safeName = row.tablename.replace(/"/g, '""');
      const countRes = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "public"."${safeName}"`);
      counts.push({
        table: row.tablename,
        count: Number(countRes.rows[0]?.count ?? 0),
      });
    }
    return counts;
  } finally {
    await client.end();
  }
}

export function printTableCounts(title: string, counts: Array<{ table: string; count: number }>): void {
  console.log(`\n${title} (${counts.length} tables):`);
  if (counts.length === 0) {
    console.log('  (no tables in public schema)');
    return;
  }
  const totalRows = counts.reduce((acc, item) => acc + item.count, 0);
  const maxLen = Math.max(...counts.map((c) => c.table.length), 5);
  for (const { table, count } of counts) {
    console.log(`  ${table.padEnd(maxLen)}  ${String(count).padStart(8)}`);
  }
  console.log(`  ${'TOTAL'.padEnd(maxLen)}  ${String(totalRows).padStart(8)}`);
}

export function resolveMediaDir(): string {
  return path.resolve(process.cwd(), process.env.MEDIA_LOCAL_DIR || 'uploads');
}

export function archiveMediaUploads(archivePath: string): boolean {
  const mediaDir = resolveMediaDir();
  if (!existsSync(mediaDir)) {
    console.warn(`[with-media] Uploads directory not found at ${mediaDir}, skipping media archive.`);
    return false;
  }
  const parentDir = path.dirname(mediaDir);
  const folderName = path.basename(mediaDir);
  const res = spawnSync('tar', ['-czf', archivePath, '-C', parentDir, folderName], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Failed to archive media directory from ${mediaDir}`);
  }
  return true;
}

export function restoreMediaUploads(archivePath: string): void {
  const mediaDir = resolveMediaDir();
  const parentDir = path.dirname(mediaDir);
  const res = spawnSync('tar', ['-xzf', archivePath, '-C', parentDir], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    throw new Error(`Failed to extract media archive ${archivePath}`);
  }
}
