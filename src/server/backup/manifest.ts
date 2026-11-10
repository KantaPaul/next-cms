import { readFileSync } from 'node:fs';
import path from 'node:path';

export type JournalInfo = {
  latestTag: string;
  latestIdx: number;
  tags: string[];
};

export function getAppVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as { version?: string };
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

export function getMigrationJournalInfo(): JournalInfo {
  try {
    const journalPath = path.join(
      process.cwd(),
      'src/db/migrations/meta/_journal.json'
    );
    const raw = JSON.parse(readFileSync(journalPath, 'utf8')) as {
      entries?: Array<{ idx: number; tag: string }>;
    };
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    const last = entries[entries.length - 1];
    return {
      latestTag: last?.tag ?? '00000000000000_unknown',
      latestIdx: typeof last?.idx === 'number' ? last.idx : entries.length - 1,
      tags: entries.map(e => e.tag),
    };
  } catch {
    return {
      latestTag: '00000000000000_unknown',
      latestIdx: 0,
      tags: [],
    };
  }
}

/**
 * Restore requires the backup to come from the same or an older migration tag.
 * Restoring a backup created on a newer migration tag is refused.
 */
export function isBackupMigrationCompatible(
  backupTag: string | undefined | null,
  journalTags: string[]
): { compatible: boolean; reason?: string } {
  if (!backupTag || typeof backupTag !== 'string') {
    return {
      compatible: false,
      reason: 'Backup manifest is missing a migration tag.',
    };
  }

  if (journalTags.length === 0) {
    return { compatible: true };
  }

  const latestTag = journalTags[journalTags.length - 1]!;
  if (journalTags.includes(backupTag)) {
    return { compatible: true };
  }

  // Not in our journal: compare timestamp prefix (YYYYMMDDHHMMSS) against latestTag
  const backupTs = backupTag.split('_')[0] ?? '';
  const latestTs = latestTag.split('_')[0] ?? '';
  if (/^\d{14}$/.test(backupTs) && /^\d{14}$/.test(latestTs)) {
    if (backupTs > latestTs) {
      return {
        compatible: false,
        reason: `Backup migration (${backupTag}) is newer than this installation (${latestTag}).`,
      };
    }
    return { compatible: true };
  }

  return {
    compatible: false,
    reason: `Backup migration (${backupTag}) is incompatible with this installation (${latestTag}).`,
  };
}

/**
 * Selects backups to delete so at most `keepLast` remain (keeping the newest).
 */
export function selectBackupsToPrune<
  T extends { id: string; createdAt: Date | string },
>(items: T[], keepLast: number): T[] {
  const limit = Math.max(1, Math.floor(keepLast));
  if (items.length <= limit) return [];
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.slice(limit);
}
