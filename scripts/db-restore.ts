import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  BACKUPS_DIR,
  DEFAULT_DOCKER_CONTAINER,
  getTableRowCounts,
  hasBinary,
  isVersionMismatchError,
  parseDatabaseUrl,
  printTableCounts,
  restoreMediaUploads,
} from './lib/db-cli';

function parseArgs(argv: string[]) {
  let fileArg: string | null = null;
  let yes = false;
  let forceProduction = false;
  let withMedia = false;

  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') yes = true;
    else if (arg === '--force-production') forceProduction = true;
    else if (arg === '--with-media') withMedia = true;
    else if (arg.startsWith('--file=')) fileArg = arg.slice('--file='.length);
    else if (!arg.startsWith('-')) fileArg = arg;
  }

  return { fileArg, yes, forceProduction, withMedia };
}

function resolveBackupFile(fileArg: string | null): string {
  if (fileArg) {
    const resolved = path.resolve(process.cwd(), fileArg);
    if (!existsSync(resolved)) {
      throw new Error(`Backup file not found: ${resolved}`);
    }
    return resolved;
  }

  if (!existsSync(BACKUPS_DIR)) {
    throw new Error('No backups/ directory found. Run "pnpm db:download" first or pass a file path.');
  }

  const candidates = readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.dump') || f.endsWith('.sql'))
    .map((name) => {
      const full = path.join(BACKUPS_DIR, name);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (candidates.length === 0) {
    throw new Error('No .dump or .sql files found in backups/.');
  }

  return candidates[0].full;
}

function runDockerRestore(
  database: string,
  user: string,
  password: string,
  isSql: boolean,
  backupFile: string,
): void {
  const input = readFileSync(backupFile);
  const cmd = isSql ? 'psql' : 'pg_restore';
  const cmdArgs = isSql
    ? ['-v', 'ON_ERROR_STOP=1', '-U', user, '-d', database]
    : ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-U', user, '-d', database];

  const args = [
    'exec',
    '-i',
    ...(password ? ['-e', `PGPASSWORD=${password}`] : []),
    DEFAULT_DOCKER_CONTAINER,
    cmd,
    ...cmdArgs,
  ];

  const res = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Docker ${cmd} failed:\n${res.stderr || res.stdout}`);
  }
}

async function confirmRestore(host: string, database: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`Restore into ${host}/${database}? This replaces all data (y/N) `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (process.env.NODE_ENV === 'production' && !opts.forceProduction) {
    throw new Error('Refusing to restore when NODE_ENV=production. Pass --force-production to override.');
  }

  const db = parseDatabaseUrl(process.env.DATABASE_URL);
  const backupFile = resolveBackupFile(opts.fileArg);
  const isSql = backupFile.endsWith('.sql');

  console.log(`Selected backup: ${path.relative(process.cwd(), backupFile)}`);

  if (!opts.yes) {
    const ok = await confirmRestore(db.host, db.database);
    if (!ok) {
      console.log('Restore cancelled.');
      return;
    }
  }

  const beforeCounts = await getTableRowCounts(db.connectionString);
  printTableCounts('Before restore', beforeCounts);

  const localBin = isSql ? 'psql' : 'pg_restore';
  if (hasBinary(localBin)) {
    const args = isSql
      ? ['-v', 'ON_ERROR_STOP=1', '-d', db.connectionString, '-f', backupFile]
      : ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', db.connectionString, backupFile];

    const res = spawnSync(localBin, args, { encoding: 'utf8' });
    if (res.status !== 0) {
      const stderr = res.stderr || '';
      if (isVersionMismatchError(stderr)) {
        console.warn(`Local ${localBin} version is older than Postgres server; falling back to Docker container...`);
        runDockerRestore(db.database, db.user, db.password, isSql, backupFile);
      } else {
        throw new Error(`${localBin} failed:\n${stderr}`);
      }
    }
  } else {
    console.log(`Local ${localBin} not found on PATH; using Docker container...`);
    runDockerRestore(db.database, db.user, db.password, isSql, backupFile);
  }

  const afterCounts = await getTableRowCounts(db.connectionString);
  printTableCounts('After restore', afterCounts);

  if (opts.withMedia) {
    const mediaArchive = `${backupFile.replace(/\.(dump|sql)$/i, '')}-uploads.tar.gz`;
    if (existsSync(mediaArchive)) {
      restoreMediaUploads(mediaArchive);
      console.log(`Media restored from ${path.relative(process.cwd(), mediaArchive)}`);
    } else {
      console.warn(`[with-media] No media archive found at ${mediaArchive}`);
    }
  }

  console.log('\nDatabase restore complete.');
}

main().catch((err) => {
  console.error('[db:restore] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
