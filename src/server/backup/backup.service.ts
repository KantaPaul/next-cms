import 'server-only';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  type BackupKind,
  type BackupManifest,
  type BackupProgress,
  backups,
  siteSettings,
  sites,
} from '@/db/schema';
import type { BackupSettings } from '@/lib/site-essentials-types';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { siteContext } from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { storage } from '@/server/storage';
import {
  getAppVersion,
  getMigrationJournalInfo,
  isBackupMigrationCompatible,
  selectBackupsToPrune,
} from './manifest';
import {
  BACKUP_TABLES,
  type BackupTableSpec,
  EXCLUDED_SECRETS,
  scopeConditionForBackupTable,
} from './tables';
import { createZipArchive, readZipEntry, readZipIndex } from './zip';

const TABLE_EXPORT_PAGE_SIZE = 500;
const TABLES_PER_STEP = 6;
const FILES_PER_STEP = 10;
const RESTORE_BATCH_SIZE = 250;

type StagingState = {
  siteId: string;
  siteName: string;
  includeMedia: boolean;
  counts: Record<string, number>;
  checksums: Record<string, string>;
  fileKeys: string[];
};

function stagingDirFor(backupId: string) {
  return path.join(os.tmpdir(), `nextcms-backup-${backupId}`);
}

function stagingStatePath(backupId: string) {
  return path.join(stagingDirFor(backupId), 'staging-state.json');
}

async function readStagingState(backupId: string): Promise<StagingState> {
  const raw = await fsp.readFile(stagingStatePath(backupId), 'utf8');
  return JSON.parse(raw) as StagingState;
}

async function writeStagingState(backupId: string, state: StagingState) {
  await fsp.writeFile(
    stagingStatePath(backupId),
    JSON.stringify(state),
    'utf8'
  );
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function sortRowsSelfParentFirst(
  rows: Record<string, unknown>[],
  parentKey: string
): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    if (typeof r.id === 'string') byId.set(r.id, r);
  }
  const visited = new Set<string>();
  const ordered: Record<string, unknown>[] = [];

  const visit = (row: Record<string, unknown>, stack: Set<string>) => {
    const id = typeof row.id === 'string' ? row.id : '';
    if (id && visited.has(id)) return;
    const parentId =
      typeof row[parentKey] === 'string' ? (row[parentKey] as string) : null;
    if (parentId && byId.has(parentId) && !visited.has(parentId)) {
      if (!stack.has(parentId)) {
        if (id) stack.add(id);
        visit(byId.get(parentId)!, stack);
        if (id) stack.delete(id);
      }
    }
    if (id) visited.add(id);
    ordered.push(row);
  };

  for (const row of rows) {
    visit(row, new Set());
  }
  return ordered;
}

function hydrateDatesAndOmissions(
  row: Record<string, unknown>,
  spec: BackupTableSpec,
  fallbackWebhookSecret?: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  if (spec.omitOnRestore) {
    for (const col of spec.omitOnRestore) {
      delete out[col];
    }
  }
  if (spec.dateColumns) {
    for (const col of spec.dateColumns) {
      const v = out[col];
      if (typeof v === 'string' && v) {
        const parsed = new Date(v);
        if (!Number.isNaN(parsed.getTime())) {
          out[col] = parsed;
        }
      }
    }
  }
  if (spec.name === 'webhook_subscriptions' && !out.secret) {
    out.secret = fallbackWebhookSecret ?? 'restored-rotate-secret';
  }
  return out;
}

/**
 * Streams a table in pages of 500 rows directly to `destPath` as a JSON array,
 * returning the row count, SHA-256 checksum, and any referenced file keys.
 */
async function streamTableToJsonFile(
  spec: BackupTableSpec,
  siteId: string,
  destPath: string,
  collectFiles: boolean
): Promise<{ count: number; checksum: string; fileKeys: string[] }> {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const ws = fs.createWriteStream(destPath, { encoding: 'utf8' });
  const hash = createHash('sha256');
  const writeChunk = async (chunk: string) => {
    hash.update(chunk);
    if (!ws.write(chunk)) {
      await new Promise<void>(resolve => ws.once('drain', resolve));
    }
  };

  await writeChunk('[');
  let total = 0;
  let offset = 0;
  const fileKeys: string[] = [];

  try {
    const cond = scopeConditionForBackupTable(spec, db, siteId);
    for (;;) {
      const baseQuery = db.select().from(spec.table);
      const scopedQuery = cond ? baseQuery.where(cond) : baseQuery;
      const orderedQuery = spec.idCol
        ? scopedQuery.orderBy(asc(spec.idCol))
        : scopedQuery;
      const rows = (await orderedQuery
        .limit(TABLE_EXPORT_PAGE_SIZE)
        .offset(offset)) as Record<string, unknown>[];

      if (rows.length === 0) break;

      for (const rawRow of rows) {
        const scrubbed = spec.scrub ? spec.scrub(rawRow) : rawRow;
        if (collectFiles) {
          if (spec.name === 'media' && typeof scrubbed.key === 'string') {
            fileKeys.push(scrubbed.key);
          } else if (
            spec.name === 'form_submissions' &&
            Array.isArray(scrubbed.files)
          ) {
            for (const f of scrubbed.files as Array<{ key?: string }>) {
              if (f && typeof f.key === 'string') {
                fileKeys.push(f.key);
              }
            }
          }
        }
        const prefix = total === 0 ? '\n' : ',\n';
        await writeChunk(prefix + JSON.stringify(scrubbed));
        total++;
      }

      if (rows.length < TABLE_EXPORT_PAGE_SIZE) break;
      offset += rows.length;
    }

    await writeChunk(total > 0 ? '\n]' : ']');
    await new Promise<void>((resolve, reject) => {
      ws.on('finish', resolve);
      ws.on('error', reject);
      ws.end();
    });
  } catch (err) {
    ws.destroy();
    throw err;
  }

  return { count: total, checksum: hash.digest('hex'), fileKeys };
}

function createZipFromDirectory(
  sourceDir: string,
  zipFilePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = createZipArchive(9);

    output.on('close', () => resolve());
    output.on('error', (err: unknown) => reject(err));
    archive.on('error', (err: unknown) => reject(err));

    archive.pipe(output);
    archive.directory(path.join(sourceDir, 'tables'), 'tables');
    if (fs.existsSync(path.join(sourceDir, 'files'))) {
      archive.directory(path.join(sourceDir, 'files'), 'files');
    }
    archive.file(path.join(sourceDir, 'manifest.json'), {
      name: 'manifest.json',
    });
    archive.finalize();
  });
}


const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', pdf: 'application/pdf',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
  json: 'application/json', txt: 'text/plain', csv: 'text/csv',
};

function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export const backupService = {
  listBackups: async (siteId: string) => {
    return db
      .select()
      .from(backups)
      .where(and(eq(backups.siteId, siteId), isNull(backups.deletedAt)))
      .orderBy(desc(backups.createdAt));
  },

  getBackup: async (backupId: string, siteId: string) => {
    const [row] = await db
      .select()
      .from(backups)
      .where(
        and(
          eq(backups.id, backupId),
          eq(backups.siteId, siteId),
          isNull(backups.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  createBackupJob: async (input: {
    siteId: string;
    kind: BackupKind;
    includeMedia: boolean;
    createdBy?: string | null;
  }) => {
    const site = await siteContext.getById(input.siteId);
    const siteName = site?.name ?? input.siteId;

    const initialProgress: BackupProgress = {
      phase: 'tables',
      tableIndex: 0,
      totalTables: BACKUP_TABLES.length,
      fileIndex: 0,
      totalFiles: 0,
      processedRows: 0,
      currentItem: BACKUP_TABLES[0]?.name,
    };

    const [row] = await db
      .insert(backups)
      .values({
        siteId: input.siteId,
        kind: input.kind,
        status: 'pending',
        includeMedia: input.includeMedia,
        progress: initialProgress,
        createdBy: input.createdBy ?? null,
      })
      .returning();

    const storageKey = `backups/${row.id}.zip`;
    const [updated] = await db
      .update(backups)
      .set({ storageKey, status: 'running', updatedAt: new Date() })
      .where(eq(backups.id, row.id))
      .returning();

    const staging = stagingDirFor(row.id);
    await fsp.mkdir(path.join(staging, 'tables'), { recursive: true });
    await writeStagingState(row.id, {
      siteId: input.siteId,
      siteName,
      includeMedia: input.includeMedia,
      counts: {},
      checksums: {},
      fileKeys: [],
    });

    return updated;
  },

  stepBackupJob: async (backupId: string, siteId: string) => {
    const row = await backupService.getBackup(backupId, siteId);
    if (!row) throw new Error('Backup job not found');
    if (row.status === 'ready' || row.status === 'failed') return row;

    const progress: BackupProgress = row.progress ?? {
      phase: 'tables',
      tableIndex: 0,
      totalTables: BACKUP_TABLES.length,
      fileIndex: 0,
      totalFiles: 0,
      processedRows: 0,
    };

    try {
      const state = await readStagingState(backupId);
      const staging = stagingDirFor(backupId);

      if (progress.phase === 'tables') {
        const end = Math.min(
          BACKUP_TABLES.length,
          progress.tableIndex + TABLES_PER_STEP
        );
        for (let i = progress.tableIndex; i < end; i++) {
          const spec = BACKUP_TABLES[i]!;
          const relPath = `tables/${spec.name}.json`;
          const destPath = path.join(staging, relPath);
          const { count, checksum, fileKeys } = await streamTableToJsonFile(
            spec,
            siteId,
            destPath,
            state.includeMedia
          );
          state.counts[spec.name] = count;
          state.checksums[relPath] = checksum;
          progress.processedRows += count;
          if (fileKeys.length > 0) {
            state.fileKeys.push(...fileKeys);
          }
        }
        state.fileKeys = Array.from(new Set(state.fileKeys));
        await writeStagingState(backupId, state);

        progress.tableIndex = end;
        if (end >= BACKUP_TABLES.length) {
          if (state.includeMedia && state.fileKeys.length > 0) {
            progress.phase = 'files';
            progress.fileIndex = 0;
            progress.totalFiles = state.fileKeys.length;
            progress.currentItem = state.fileKeys[0];
          } else {
            progress.phase = 'packaging';
            progress.currentItem = 'Creating zip archive';
          }
        } else {
          progress.currentItem = BACKUP_TABLES[end]?.name;
        }

        const [updated] = await db
          .update(backups)
          .set({ progress, updatedAt: new Date() })
          .where(eq(backups.id, backupId))
          .returning();
        return updated;
      }

      if (progress.phase === 'files') {
        const driver = storage();
        const end = Math.min(
          state.fileKeys.length,
          progress.fileIndex + FILES_PER_STEP
        );
        for (let i = progress.fileIndex; i < end; i++) {
          const key = state.fileKeys[i]!;
          if (key.includes('..') || path.isAbsolute(key)) continue;
          const data = await driver.read(key).catch(() => null);
          if (!data) continue;
          const relPath = `files/${key}`;
          const destPath = path.join(staging, relPath);
          await fsp.mkdir(path.dirname(destPath), { recursive: true });
          await fsp.writeFile(destPath, data);
          state.checksums[relPath] = sha256(data);
        }
        await writeStagingState(backupId, state);

        progress.fileIndex = end;
        if (end >= state.fileKeys.length) {
          progress.phase = 'packaging';
          progress.currentItem = 'Creating zip archive';
        } else {
          progress.currentItem = state.fileKeys[end];
        }

        const [updated] = await db
          .update(backups)
          .set({ progress, updatedAt: new Date() })
          .where(eq(backups.id, backupId))
          .returning();
        return updated;
      }

      // packaging phase
      const journal = getMigrationJournalInfo();
      const manifest: BackupManifest = {
        formatVersion: 1,
        appVersion: getAppVersion(),
        migrationTag: journal.latestTag,
        migrationIdx: journal.latestIdx,
        createdAt: new Date().toISOString(),
        siteId: state.siteId,
        siteName: state.siteName,
        includeMedia: state.includeMedia,
        excludedSecrets: [...EXCLUDED_SECRETS],
        counts: state.counts,
        checksums: state.checksums,
      };

      await fsp.writeFile(
        path.join(staging, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      );

      const zipOutPath = path.join(staging, 'archive.zip');
      await createZipFromDirectory(staging, zipOutPath);
      const zipBuffer = await fsp.readFile(zipOutPath);
      const storageKey = row.storageKey ?? `backups/${row.id}.zip`;
      await storage().put(storageKey, zipBuffer, 'application/zip');

      await fsp.rm(staging, { recursive: true, force: true }).catch(() => {});

      progress.phase = 'done';
      progress.currentItem = undefined;

      const [finalized] = await db
        .update(backups)
        .set({
          status: 'ready',
          size: zipBuffer.length,
          storageKey,
          manifest,
          progress,
          updatedAt: new Date(),
        })
        .where(eq(backups.id, backupId))
        .returning();

      if (row.createdBy) {
        await auditService.log({
          actorId: row.createdBy,
          action: 'create',
          targetType: 'backup',
          targetId: finalized.id,
          targetName: `${row.kind} backup`,
          details: JSON.stringify({
            kind: row.kind,
            includeMedia: row.includeMedia,
            size: finalized.size,
            migrationTag: manifest.migrationTag,
          }),
        });
      }

      return finalized;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Backup failed unexpectedly.';
      await fsp
        .rm(stagingDirFor(backupId), { recursive: true, force: true })
        .catch(() => {});
      const [failed] = await db
        .update(backups)
        .set({
          status: 'failed',
          error: message,
          updatedAt: new Date(),
        })
        .where(eq(backups.id, backupId))
        .returning();
      return failed;
    }
  },

  runBackupToCompletion: async (input: {
    siteId: string;
    kind: BackupKind;
    includeMedia: boolean;
    createdBy?: string | null;
  }) => {
    let job = await backupService.createBackupJob(input);
    while (job.status !== 'ready' && job.status !== 'failed') {
      job = await backupService.stepBackupJob(job.id, input.siteId);
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Backup failed');
    }
    return job;
  },

  readBackupZip: async (backupId: string, siteId: string) => {
    const row = await backupService.getBackup(backupId, siteId);
    if (!row || row.status !== 'ready' || !row.storageKey) return null;
    if (!row.storageKey.startsWith('backups/')) return null;
    const data = await storage().read(row.storageKey);
    if (!data) return null;
    return { backup: row, data };
  },

  deleteBackup: async (
    backupId: string,
    siteId: string,
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const row = await backupService.getBackup(backupId, siteId);
    if (!row) return false;
    if (row.storageKey) {
      await storage()
        .remove(row.storageKey)
        .catch(() => {});
    }
    await db
      .delete(backups)
      .where(and(eq(backups.id, backupId), eq(backups.siteId, siteId)));
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'backup',
      targetId: backupId,
      targetName: `${row.kind} backup`,
    });
    return true;
  },

  pruneOldBackups: async (
    siteId: string,
    keepLast: number,
    kind?: BackupKind
  ) => {
    const conditions = [
      eq(backups.siteId, siteId),
      eq(backups.status, 'ready'),
      isNull(backups.deletedAt),
    ];
    if (kind) conditions.push(eq(backups.kind, kind));

    const rows = await db
      .select()
      .from(backups)
      .where(and(...conditions))
      .orderBy(desc(backups.createdAt));

    const toDelete = selectBackupsToPrune(rows, keepLast);
    const driver = storage();
    for (const old of toDelete) {
      if (old.storageKey) {
        await driver.remove(old.storageKey).catch(() => {});
      }
      await db.delete(backups).where(eq(backups.id, old.id));
    }
    return toDelete.length;
  },

  restoreBackup: async (input: {
    backupId: string;
    siteId: string;
    confirmSiteName: string;
    access: UserAccess;
  }) => {
    await accessService.assertPermission(
      input.access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );

    const site = await siteContext.getById(input.siteId);
    if (!site) throw new Error('Site not found.');
    if (input.confirmSiteName.trim() !== site.name.trim()) {
      throw new Error(
        `Confirmation failed: type "${site.name}" to restore.`
      );
    }

    const loaded = await backupService.readBackupZip(
      input.backupId,
      input.siteId
    );
    if (!loaded) {
      throw new Error('Backup archive could not be found in storage.');
    }

    const entries = readZipIndex(loaded.data);
    const manifestEntry = entries.get('manifest.json');
    if (!manifestEntry) {
      throw new Error('Backup archive is missing manifest.json.');
    }

    const manifest = JSON.parse(
      readZipEntry(loaded.data, manifestEntry).toString('utf8')
    ) as BackupManifest;

    if (manifest.siteId !== input.siteId) {
      throw new Error('Backup belongs to a different site.');
    }

    const journal = getMigrationJournalInfo();
    const compat = isBackupMigrationCompatible(
      manifest.migrationTag,
      journal.tags
    );
    if (!compat.compatible) {
      throw new Error(compat.reason || 'Incompatible backup migration version.');
    }

    // Verify table file checksums before mutating any DB state
    for (const spec of BACKUP_TABLES) {
      const rel = `tables/${spec.name}.json`;
      const entry = entries.get(rel);
      if (!entry) continue;
      const expectedChecksum = manifest.checksums?.[rel];
      if (expectedChecksum) {
        const buf = readZipEntry(loaded.data, entry);
        if (sha256(buf) !== expectedChecksum) {
          throw new Error(`Checksum mismatch for ${rel}`);
        }
      }
    }

    // Snapshot existing site secrets (e.g. Mailchimp API key, webhook secrets) to preserve them
    const existingSettings = await siteSettingsService.getForSite(input.siteId);
    const existingIntegrations = existingSettings.integrations;

    // 1. Automatically take a pre-restore safety backup first
    const safetyBackup = await backupService.runBackupToCompletion({
      siteId: input.siteId,
      kind: 'pre-restore',
      includeMedia: loaded.backup.includeMedia,
      createdBy: input.access.userId,
    });

    // 2 + 3. Replace the site's rows in ONE transaction: if any insert fails,
    // everything rolls back and the site is exactly as it was. (Separate
    // transactions could leave a half-deleted site behind.)
    await db.transaction(async tx => {
    for (let i = BACKUP_TABLES.length - 1; i >= 0; i--) {
      const spec = BACKUP_TABLES[i]!;
      if (!spec.replaceOnRestore) continue;
      const cond = scopeConditionForBackupTable(spec, tx, input.siteId);
      if (cond) {
        await tx.delete(spec.table).where(cond);
      }
    }

    // Restore tables in FK-safe order, batched inside the same transaction.
    for (const spec of BACKUP_TABLES) {
      const rel = `tables/${spec.name}.json`;
      const entry = entries.get(rel);
      if (!entry) continue;

      // Never overwrite api_keys on restore (hashes were excluded)
      if (spec.name === 'api_keys') continue;

      let rows = JSON.parse(
        readZipEntry(loaded.data, entry).toString('utf8')
      ) as Record<string, unknown>[];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      if (spec.selfParentKey) {
        rows = sortRowsSelfParentFirst(rows, spec.selfParentKey);
      }

      // Re-attach existing Mailchimp integration secret onto restored site_settings
      if (spec.name === 'site_settings') {
        rows = rows.map(r => {
          const restoredInt =
            r.integrations && typeof r.integrations === 'object'
              ? { ...(r.integrations as Record<string, unknown>) }
              : {};
          if (existingIntegrations?.mailchimp?.apiKey) {
            restoredInt.mailchimp = {
              ...(typeof restoredInt.mailchimp === 'object'
                ? (restoredInt.mailchimp as Record<string, unknown>)
                : {}),
              apiKey: existingIntegrations.mailchimp.apiKey,
            };
          }
          return { ...r, integrations: restoredInt };
        });
      }

      for (let i = 0; i < rows.length; i += RESTORE_BATCH_SIZE) {
        const batch = rows
          .slice(i, i + RESTORE_BATCH_SIZE)
          .map(r => hydrateDatesAndOmissions(r, spec));

        await tx.insert(spec.table).values(batch).onConflictDoNothing();
      }
    }
    });

    // 4. Restore media & form-upload files ONLY if present in the zip
    const driver = storage();
    let restoredFiles = 0;
    for (const [name, entry] of entries.entries()) {
      if (!name.startsWith('files/')) continue;
      const key = name.slice('files/'.length);
      if (!key || key.includes('..') || key.startsWith('backups/')) continue;
      const buf = readZipEntry(loaded.data, entry);
      const expectedChecksum = manifest.checksums?.[name];
      if (expectedChecksum && sha256(buf) !== expectedChecksum) {
        throw new Error(`Checksum mismatch for ${name}`);
      }
      // A real content type matters on S3, where files are served straight from
      // the bucket; octet-stream would make browsers download every image.
      await driver.put(key, buf, contentTypeForKey(key));
      restoredFiles++;
    }

    await auditService.log({
      actorId: input.access.userId,
      action: 'restore',
      targetType: 'backup',
      targetId: input.backupId,
      targetName: site.name,
      details: JSON.stringify({
        safetyBackupId: safetyBackup.id,
        restoredFiles,
        migrationTag: manifest.migrationTag,
      }),
    });

    revalidatePublicSite();
    return {
      ok: true,
      safetyBackupId: safetyBackup.id,
      restoredFiles,
    };
  },

  runScheduledBackups: async () => {
    const activeSites = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(isNull(sites.deletedAt));

    const results: Array<{
      siteId: string;
      status: 'skipped' | 'ok' | 'failed';
      backupId?: string;
      pruned?: number;
      error?: string;
    }> = [];

    const now = Date.now();

    for (const site of activeSites) {
      const settings = await siteSettingsService.getForSite(site.id);
      const cfg: BackupSettings = settings.backupSettings;
      if (!cfg || cfg.frequency === 'off') {
        results.push({ siteId: site.id, status: 'skipped' });
        continue;
      }

      const intervalMs =
        cfg.frequency === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
      const lastRunMs = cfg.lastRunAt ? new Date(cfg.lastRunAt).getTime() : 0;
      if (
        cfg.lastStatus === 'ok' &&
        Number.isFinite(lastRunMs) &&
        now - lastRunMs < intervalMs
      ) {
        results.push({ siteId: site.id, status: 'skipped' });
        continue;
      }

      try {
        const job = await backupService.runBackupToCompletion({
          siteId: site.id,
          kind: 'scheduled',
          includeMedia: cfg.includeMedia ?? true,
        });
        const pruned = await backupService.pruneOldBackups(
          site.id,
          cfg.keepLast ?? 7,
          'scheduled'
        );
        await db
          .update(siteSettings)
          .set({
            backupSettings: {
              ...cfg,
              lastRunAt: new Date(now).toISOString(),
              lastStatus: 'ok',
              lastError: null,
            },
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.siteId, site.id));

        results.push({
          siteId: site.id,
          status: 'ok',
          backupId: job.id,
          pruned,
        });
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Scheduled backup failed';
        await db
          .update(siteSettings)
          .set({
            backupSettings: {
              ...cfg,
              lastRunAt: new Date(now).toISOString(),
              lastStatus: 'failed',
              lastError: error,
            },
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.siteId, site.id));
        results.push({ siteId: site.id, status: 'failed', error });
      }
    }

    return results;
  },
};
