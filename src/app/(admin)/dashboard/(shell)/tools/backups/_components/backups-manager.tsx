'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  Download,
  HardDrive,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BackupManifest, BackupProgress } from '@/db/schemas/essentials.schema';
import { useFormAction } from '@/hooks/use-form-action';
import {
  type BackupSettings,
  backupSettingsSchema,
  DEFAULT_BACKUP_SETTINGS,
} from '@/lib/site-essentials-types';
import { updateBackupSettingsAction } from '@/app/(admin)/dashboard/(shell)/settings/_modules/settings.actions';

export type BackupItem = {
  id: string;
  kind: 'manual' | 'scheduled' | 'pre-restore';
  status: 'pending' | 'running' | 'ready' | 'failed';
  size: number;
  includeMedia: boolean;
  manifest: BackupManifest | null;
  progress: BackupProgress | null;
  error: string | null;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupsManager({
  siteName,
  initialBackups,
  initialSchedule,
}: {
  siteName: string;
  initialBackups: BackupItem[];
  initialSchedule: BackupSettings;
}) {
  const router = useRouter();
  const [backupsList, setBackupsList] = useState<BackupItem[]>(initialBackups);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeProgress, setActiveProgress] = useState<BackupProgress | null>(
    null
  );
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [isPending, startTransition] = useTransition();

  const scheduleForm = useForm<BackupSettings>({
    resolver: zodResolver(backupSettingsSchema) as any,
    defaultValues: {
      ...DEFAULT_BACKUP_SETTINGS,
      ...initialSchedule,
    },
  });

  const { submit: saveSchedule, isPending: savingSchedule } = useFormAction(
    async (data: BackupSettings) => {
      const res = await updateBackupSettingsAction(data);
      return res as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        toast.success('Backup schedule saved.');
        router.refresh();
      },
    }
  );

  const refreshList = async () => {
    const res = await fetch('/api/dashboard/backups', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { backups: BackupItem[] };
      setBackupsList(data.backups);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    setActiveProgress(null);
    try {
      const startRes = await fetch('/api/dashboard/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeMedia }),
      });
      if (!startRes.ok) {
        const err = (await startRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || 'Could not start backup.');
      }
      let { backup } = (await startRes.json()) as { backup: BackupItem };
      setActiveProgress(backup.progress);

      while (backup.status !== 'ready' && backup.status !== 'failed') {
        const stepRes = await fetch(`/api/dashboard/backups/${backup.id}/step`, {
          method: 'POST',
        });
        if (!stepRes.ok) {
          const err = (await stepRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(err.error || 'Backup step failed.');
        }
        const stepped = (await stepRes.json()) as { backup: BackupItem };
        backup = stepped.backup;
        setActiveProgress(backup.progress);
      }

      if (backup.status === 'failed') {
        throw new Error(backup.error || 'Backup failed.');
      }

      toast.success('Backup created successfully.');
      await refreshList();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup failed.');
      await refreshList();
    } finally {
      setCreating(false);
      setActiveProgress(null);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/dashboard/backups/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error('Could not delete backup.');
        return;
      }
      setBackupsList(prev => prev.filter(b => b.id !== id));
      toast.success('Backup deleted.');
      router.refresh();
    });
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/dashboard/backups/${restoreTarget.id}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmSiteName: confirmName }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        restoredFiles?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Restore failed.');
      }
      setRestoreTarget(null);
      setConfirmName('');
      toast.success(
        `Site restored successfully${typeof data.restoredFiles === 'number' && data.restoredFiles > 0 ? ` (${data.restoredFiles} files restored)` : ''}. A pre-restore safety backup was created.`
      );
      await refreshList();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Create manual backup */}
      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Create backup</h2>
            <p className="mt-1 text-sm text-steel-500">
              Saves all site tables (excluding sessions, tokens, password hashes, and API keys) into a private zip archive.
            </p>
          </div>
          <Button
            type="button"
            disabled={creating}
            onClick={handleCreateBackup}
          >
            {creating ? (
              <Loader2 className="me-2 size-4 animate-spin" />
            ) : (
              <Archive className="me-2 size-4" />
            )}
            {creating ? 'Creating backup…' : 'Create backup'}
          </Button>
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeMedia}
            disabled={creating}
            onChange={e => setIncludeMedia(e.target.checked)}
            className="size-4 rounded border-steel-300 text-indigo-600"
          />
          <span>Include media & form upload files</span>
        </label>

        {activeProgress && (
          <div className="mt-4 rounded-md border border-steel-100 bg-slate-50 p-3 text-xs dark:border-dark-300 dark:bg-dark-200">
            <div className="flex items-center justify-between font-medium">
              <span>
                Phase: {activeProgress.phase}
                {activeProgress.currentItem
                  ? ` · ${activeProgress.currentItem}`
                  : ''}
              </span>
              <span>
                {activeProgress.phase === 'tables'
                  ? `${activeProgress.tableIndex}/${activeProgress.totalTables} tables`
                  : activeProgress.phase === 'files'
                    ? `${activeProgress.fileIndex}/${activeProgress.totalFiles} files`
                    : 'Packaging zip'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scheduled backups */}
      <form
        onSubmit={scheduleForm.handleSubmit(saveSchedule)}
        className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Scheduled backups</h2>
            <p className="mt-1 text-sm text-steel-500">
              Trigger <code className="font-mono text-xs">/api/cron/backup</code> with{' '}
              <code className="font-mono text-xs">Authorization: Bearer CRON_SECRET</code>.
            </p>
          </div>
          {initialSchedule.lastRunAt && (
            <div className="text-xs text-steel-500">
              Last run: {format(new Date(initialSchedule.lastRunAt), 'PPp')} (
              <span
                className={
                  initialSchedule.lastStatus === 'failed'
                    ? 'font-semibold text-rose-600'
                    : 'font-semibold text-emerald-600'
                }
              >
                {initialSchedule.lastStatus ?? 'unknown'}
              </span>
              )
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Frequency</Label>
            <Controller
              control={scheduleForm.control}
              name="frequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off (manual only)</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Keep last N scheduled backups</Label>
            <Input
              type="number"
              min={1}
              max={100}
              className="mt-1"
              {...scheduleForm.register('keepLast', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-end pb-2">
            <Controller
              control={scheduleForm.control}
              name="includeMedia"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="size-4 rounded border-steel-300 text-indigo-600"
                  />
                  <span>Include media files</span>
                </label>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={savingSchedule}>
            {savingSchedule ? (
              <Loader2 className="me-2 size-4 animate-spin" />
            ) : (
              <Save className="me-2 size-4" />
            )}
            Save schedule
          </Button>
        </div>
      </form>

      {/* Backups list */}
      <div className="rounded-lg border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-100">
        <div className="border-b border-steel-100 px-6 py-4 dark:border-dark-300">
          <h2 className="text-base font-semibold">
            Saved backups ({backupsList.length})
          </h2>
        </div>

        {backupsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-steel-500">
            <HardDrive className="mb-2 size-8 opacity-40" />
            No backups yet. Create your first backup above.
          </div>
        ) : (
          <div className="divide-y divide-steel-100 dark:divide-dark-300">
            {backupsList.map(item => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {format(new Date(item.createdAt), 'PPp')}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {item.kind}
                    </Badge>
                    <Badge
                      variant={
                        item.status === 'ready'
                          ? 'secondary'
                          : item.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {item.status}
                    </Badge>
                    {item.includeMedia && (
                      <Badge variant="outline">+ Media</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-steel-500">
                    Size: {formatBytes(item.size)}
                    {item.manifest?.migrationTag
                      ? ` · Migration: ${item.manifest.migrationTag}`
                      : ''}
                    {item.error ? ` · Error: ${item.error}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.status === 'ready' && (
                    <>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/api/dashboard/backups/${item.id}/download`}>
                          <Download className="me-1.5 size-3.5" />
                          Download
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRestoreTarget(item);
                          setConfirmName('');
                        }}
                      >
                        <RotateCcw className="me-1.5 size-3.5" />
                        Restore
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="me-1.5 size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore confirmation modal */}
      <Dialog
        open={Boolean(restoreTarget)}
        onOpenChange={open => {
          if (!open && !restoring) {
            setRestoreTarget(null);
            setConfirmName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600" />
              Restore site backup
            </DialogTitle>
            <DialogDescription>
              Restoring replaces all content, settings, and site-scoped records for{' '}
              <strong>{siteName}</strong>. A pre-restore safety backup will be created automatically before any changes are made.
            </DialogDescription>
          </DialogHeader>

          {restoreTarget && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border border-steel-200 bg-slate-50 p-3 text-xs dark:border-dark-300 dark:bg-dark-200 space-y-1">
                <p>
                  <strong>Created:</strong>{' '}
                  {format(new Date(restoreTarget.createdAt), 'PPp')}
                </p>
                <p>
                  <strong>Migration tag:</strong>{' '}
                  {restoreTarget.manifest?.migrationTag ?? 'unknown'}
                </p>
                <p>
                  <strong>Media included:</strong>{' '}
                  {restoreTarget.includeMedia ? 'Yes' : 'No (DB only)'}
                </p>
              </div>

              <div>
                <Label htmlFor="confirm-restore-site-name">
                  Type <code className="font-mono font-semibold">{siteName}</code>{' '}
                  to confirm restore
                </Label>
                <Input
                  id="confirm-restore-site-name"
                  className="mt-1.5"
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  placeholder={siteName}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restoring}
              onClick={() => {
                setRestoreTarget(null);
                setConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                restoring || confirmName.trim() !== siteName.trim()
              }
              onClick={handleRestore}
            >
              {restoring && <Loader2 className="me-2 size-4 animate-spin" />}
              {restoring ? 'Restoring…' : 'Restore backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
