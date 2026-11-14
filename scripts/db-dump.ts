import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  archiveMediaUploads,
  BACKUPS_DIR,
  DEFAULT_DOCKER_CONTAINER,
  formatTimestamp,
  getTableRowCounts,
  hasBinary,
  isVersionMismatchError,
  parseDatabaseUrl,
  printTableCounts,
} from './lib/db-cli';

function parseArgs(argv: string[]) {
  let outPath: string | null = null;
  let sql = false;
  let list = false;
  let withMedia = false;

  for (const arg of argv) {
    if (arg === '--sql') sql = true;
    else if (arg === '--list') list = true;
    else if (arg === '--with-media') withMedia = true;
    else if (arg.startsWith('--out=')) outPath = arg.slice('--out='.length);
  }

  return { outPath, sql, list, withMedia };
}

function listBackups() {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const entries = readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.dump') || f.endsWith('.sql') || f.endsWith('.tar.gz'))
    .map((name) => {
      const full = path.join(BACKUPS_DIR, name);
      const st = statSync(full);
      return { name, size: st.size, mtime: st.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (entries.length === 0) {
    console.log('No backups found in backups/.');
    return;
  }

  console.log('Available backups in backups/:');
  for (const entry of entries) {
    const kb = (entry.size / 1024).toFixed(1);
    console.log(`  ${entry.name}  (${kb} KB, ${entry.mtime.toISOString()})`);
  }
}

function runDockerDump(
  database: string,
  user: string,
  password: string,
  sql: boolean,
  targetFile: string,
): void {
  const formatFlag = sql ? '--format=plain' : '--format=custom';
  const args = [
    'exec',
    '-i',
    ...(password ? ['-e', `PGPASSWORD=${password}`] : []),
    DEFAULT_DOCKER_CONTAINER,
    'pg_dump',
    formatFlag,
    '--no-owner',
    '--no-privileges',
    '-U',
    user,
    '-d',
    database,
  ];

  const res = spawnSync('docker', args, {
    encoding: null,
    maxBuffer: 1024 * 1024 * 512,
  });

  if (res.status !== 0) {
    const errText = res.stderr ? res.stderr.toString('utf8') : 'Unknown docker pg_dump error';
    throw new Error(`Docker pg_dump failed:\n${errText}`);
  }

  writeFileSync(targetFile, res.stdout);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.list) {
    listBackups();
    return;
  }

  const db = parseDatabaseUrl(process.env.DATABASE_URL);
  const ext = opts.sql ? 'sql' : 'dump';
  const defaultName = `${db.database}-${formatTimestamp()}.${ext}`;
  const targetFile = opts.outPath
    ? path.resolve(process.cwd(), opts.outPath)
    : path.join(BACKUPS_DIR, defaultName);

  mkdirSync(path.dirname(targetFile), { recursive: true });

  console.log(`Dumping database "${db.database}" on ${db.host}:${db.port}...`);
  const counts = await getTableRowCounts(db.connectionString);
  printTableCounts('Database snapshot', counts);

  let usedDocker = false;
  if (hasBinary('pg_dump')) {
    const formatFlag = opts.sql ? '--format=plain' : '--format=custom';
    const res = spawnSync(
      'pg_dump',
      [formatFlag, '--no-owner', '--no-privileges', `--file=${targetFile}`, db.connectionString],
      { encoding: 'utf8' },
    );

    if (res.status !== 0) {
      const stderr = res.stderr || '';
      if (isVersionMismatchError(stderr)) {
        console.warn('Local pg_dump version is older than Postgres server; falling back to Docker container...');
        runDockerDump(db.database, db.user, db.password, opts.sql, targetFile);
        usedDocker = true;
      } else {
        throw new Error(`pg_dump failed:\n${stderr}`);
      }
    }
  } else {
    console.log('Local pg_dump not found on PATH; using Docker container...');
    runDockerDump(db.database, db.user, db.password, opts.sql, targetFile);
    usedDocker = true;
  }

  const sizeKb = (statSync(targetFile).size / 1024).toFixed(1);
  console.log(`\nBackup saved to ${path.relative(process.cwd(), targetFile)} (${sizeKb} KB${usedDocker ? ', via Docker' : ''})`);

  if (opts.withMedia) {
    const mediaArchive = `${targetFile.replace(/\.(dump|sql)$/i, '')}-uploads.tar.gz`;
    if (archiveMediaUploads(mediaArchive)) {
      console.log(`Media archive saved to ${path.relative(process.cwd(), mediaArchive)}`);
    }
  }
}

main().catch((err) => {
  console.error('[db:download] Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
