'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  FileUp,
  Loader2,
  PauseCircle,
  Play,
  RotateCcw,
  Upload,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  ImportItemKind,
  ImportItemStatus,
  ImportJobCounts,
  ImportJobOptions,
  ImportJobProgress,
  ImportJobReport,
  ImportJobStatus,
} from '@/db/schemas/operations.schema';

export type ImportJobSummary = {
  id: string;
  sourceKind: string;
  sourceFilename: string | null;
  status: string;
  options: ImportJobOptions;
  counts: ImportJobCounts;
  progress: ImportJobProgress;
  report: ImportJobReport;
  createdAt: string;
  updatedAt: string | null;
};

type ReportEntry = {
  kind: ImportItemKind;
  wpId: string;
  title: string;
  status: ImportItemStatus;
  newId?: string | null;
  newUrl?: string | null;
  oldUrl?: string | null;
  message?: string | null;
  dashboardUrl?: string | null;
};

const STATUS_BADGE: Record<
  ImportJobStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  parsed: 'secondary',
  running: 'default',
  done: 'outline',
  failed: 'destructive',
  cancelled: 'secondary',
};

export function ImportWizard({
  initialJobs,
}: {
  initialJobs: ImportJobSummary[];
}) {
  const [jobs, setJobs] = useState<ImportJobSummary[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<ImportJobSummary | null>(
    initialJobs.find(
      j => j.status === 'parsed' || j.status === 'running' || j.status === 'cancelled'
    ) ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [reportEntries, setReportEntries] = useState<ReportEntry[]>([]);
  const [reportFilter, setReportFilter] = useState<
    'all' | 'done' | 'renamed' | 'skipped' | 'failed'
  >('all');
  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadReport = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/import/${jobId}/report`, {
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      job: ImportJobSummary;
      entries: ReportEntry[];
    };
    setActiveJob(data.job);
    setReportEntries(data.entries);
  }, []);

  useEffect(() => {
    if (activeJob?.status === 'done') {
      void loadReport(activeJob.id);
    }
  }, [activeJob?.id, activeJob?.status, loadReport]);

  const upsertJobInList = (job: ImportJobSummary) => {
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === job.id);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = job;
      return next;
    });
  };

  async function handleFileUpload(file: File) {
    setUploading(true);
    setReportEntries([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as {
        job?: ImportJobSummary;
        error?: string;
      };
      if (!res.ok || !data.job) {
        toast.error(data.error ?? 'Failed to upload import file');
        return;
      }
      setActiveJob(data.job);
      upsertJobInList(data.job);
      toast.success('Import file parsed and ready to review.');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function updateOption<K extends keyof ImportJobOptions>(
    key: K,
    value: ImportJobOptions[K]
  ) {
    if (!activeJob) return;
    const nextOptions = { ...activeJob.options, [key]: value };
    setActiveJob({ ...activeJob, options: nextOptions });
    const res = await fetch(`/api/import/${activeJob.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { [key]: value } }),
    });
    if (res.ok) {
      const data = (await res.json()) as { job: ImportJobSummary };
      setActiveJob(data.job);
      upsertJobInList(data.job);
    }
  }

  async function runLoop(jobToRun: ImportJobSummary) {
    cancelRef.current = false;
    setStepping(true);
    let current = jobToRun;

    try {
      if (current.status === 'cancelled') {
        const res = await fetch(`/api/import/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'running' }),
        });
        if (res.ok) {
          const data = (await res.json()) as { job: ImportJobSummary };
          current = data.job;
          setActiveJob(current);
        }
      }

      while (!cancelRef.current) {
        const res = await fetch(`/api/import/${current.id}/step`, {
          method: 'POST',
        });
        const data = (await res.json()) as {
          job?: ImportJobSummary;
          error?: string;
        };
        if (!res.ok || !data.job) {
          toast.error(data.error ?? 'Import step failed');
          break;
        }
        current = data.job;
        setActiveJob(current);
        upsertJobInList(current);

        if (
          current.status === 'done' ||
          current.status === 'failed' ||
          current.status === 'cancelled'
        ) {
          if (current.status === 'done') {
            toast.success('Import completed!');
            await loadReport(current.id);
          }
          break;
        }
      }
    } catch {
      toast.error('Import paused due to a network error. Click Resume to continue.');
    } finally {
      setStepping(false);
    }
  }

  async function handleCancel() {
    if (!activeJob) return;
    cancelRef.current = true;
    const res = await fetch(`/api/import/${activeJob.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (res.ok) {
      const data = (await res.json()) as { job: ImportJobSummary };
      setActiveJob(data.job);
      upsertJobInList(data.job);
      toast.info('Import paused. You can resume anytime.');
    }
  }

  const counts = activeJob?.counts;
  const progress = activeJob?.progress;
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : activeJob?.status === 'done'
        ? 100
        : 0;

  const renamedIds = new Set(
    (activeJob?.report?.renames ?? []).map(r => `${r.kind}:${r.wpId}`)
  );

  const filteredEntries = reportEntries.filter(entry => {
    if (reportFilter === 'all') return true;
    if (reportFilter === 'renamed') {
      return renamedIds.has(`${entry.kind}:${entry.wpId}`);
    }
    return entry.status === reportFilter;
  });

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {!activeJob && (
        <Card>
          <CardHeader>
            <CardTitle>Upload WordPress WXR or Elementor template</CardTitle>
            <CardDescription>
              Export your site from WordPress via{' '}
              <strong>Tools → Export → All content</strong> (.xml, up to 100 MB),
              or upload a standalone Elementor template (.json).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-10 text-center">
              <FileUp className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Choose a <code>.xml</code> (WXR) or <code>.json</code> (Elementor)
                file
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Posts, pages, Elementor layouts, media, categories/tags, menus,
                approved comments, Yoast/Rank Math SEO, and redirects are imported
                in batches.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.json,text/xml,application/xml,application/json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
              <Button
                className="mt-4"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing file…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Select file
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Job: Preview, Options, Progress, Report */}
      {activeJob && counts && progress && (
        <>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{activeJob.sourceFilename || 'Import job'}</CardTitle>
                  <Badge
                    variant={
                      STATUS_BADGE[activeJob.status as ImportJobStatus] ??
                      'secondary'
                    }
                  >
                    {activeJob.status}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Source:{' '}
                  {activeJob.sourceKind === 'elementor_json'
                    ? 'Elementor template JSON'
                    : 'WordPress WXR XML'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={stepping}
                  onClick={() => {
                    setActiveJob(null);
                    setReportEntries([]);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  New import
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview Counts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {activeJob.sourceKind === 'wxr' ? (
                  <>
                    <StatBox label="Posts" value={counts.posts} />
                    <StatBox label="Pages" value={counts.pages} />
                    <StatBox label="Elementor pages" value={counts.elementorPages} />
                    <StatBox label="Media" value={counts.attachments} />
                    <StatBox label="Menus" value={counts.menus} />
                    <StatBox label="Categories" value={counts.categories} />
                    <StatBox label="Tags" value={counts.tags} />
                    <StatBox label="Comments" value={counts.comments} />
                    <StatBox label="Authors" value={counts.authors} />
                  </>
                ) : (
                  <>
                    <StatBox label="Templates" value={counts.templates} />
                    <StatBox label="Elementor layouts" value={counts.elementorPages} />
                  </>
                )}
              </div>

              {/* Skipped CPTs */}
              {Object.keys(counts.skippedTypes ?? {}).length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    Unsupported post types will be skipped:
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {Object.entries(counts.skippedTypes).map(([type, cnt]) => (
                      <Badge key={type} variant="outline">
                        {type}: {cnt}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Elementor fallback widget notice */}
              {counts.fallbackWidgets?.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <FileCode2 className="h-4 w-4 text-muted-foreground" />
                    Elementor widgets falling back to plain text:
                  </div>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {counts.fallbackWidgets.map((fw, i) => (
                      <li key={`${fw.widget}-${fw.pageTitle}-${i}`}>
                        <code>{fw.widget}</code> on <strong>{fw.pageTitle}</strong>{' '}
                        ({fw.count}×)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Options (editable while parsed or cancelled) */}
              {(activeJob.status === 'parsed' ||
                activeJob.status === 'cancelled') && (
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-semibold">Import options</h3>
                  {activeJob.sourceKind === 'wxr' ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <OptionToggle
                        id="opt-media"
                        label="Download media"
                        description="Fetch attachments into the media library"
                        checked={activeJob.options.downloadMedia}
                        onCheckedChange={v => updateOption('downloadMedia', v)}
                      />
                      <OptionToggle
                        id="opt-drafts"
                        label="Import as drafts"
                        description="Hold all posts and pages as drafts"
                        checked={activeJob.options.importAsDrafts}
                        onCheckedChange={v => updateOption('importAsDrafts', v)}
                      />
                      <OptionToggle
                        id="opt-redirects"
                        label="Create redirects"
                        description="Add 301s from old WordPress permalinks"
                        checked={activeJob.options.createRedirects}
                        onCheckedChange={v => updateOption('createRedirects', v)}
                      />
                      <OptionToggle
                        id="opt-comments"
                        label="Import comments"
                        description="Bring over approved comments & replies"
                        checked={activeJob.options.importComments}
                        onCheckedChange={v => updateOption('importComments', v)}
                      />
                      <OptionToggle
                        id="opt-authors"
                        label="Import authors"
                        description="Create inactive Author accounts"
                        checked={activeJob.options.importAuthors}
                        onCheckedChange={v => updateOption('importAuthors', v)}
                      />
                    </div>
                  ) : (
                    <div className="max-w-xs space-y-1.5">
                      <Label>Save Elementor template as</Label>
                      <Select
                        value={
                          activeJob.options.templateTarget ?? 'page_template'
                        }
                        onValueChange={v =>
                          updateOption(
                            'templateTarget',
                            v as 'page_template' | 'global_block'
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="page_template">
                            Page template
                          </SelectItem>
                          <SelectItem value="global_block">
                            Global block
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar + controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {stepping
                      ? `Importing: ${progress.currentItem ?? 'Starting…'}`
                      : activeJob.status === 'done'
                        ? 'Import complete'
                        : activeJob.status === 'cancelled'
                          ? 'Import paused'
                          : 'Ready to start'}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {progress.processed} / {progress.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Imported: {progress.imported}
                    </span>
                    <span>Skipped: {progress.skipped}</span>
                    <span className="inline-flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      Failed: {progress.failed}
                    </span>
                    {activeJob.report?.redirectsCreated > 0 && (
                      <span>
                        Redirects: {activeJob.report.redirectsCreated}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {stepping ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    ) : (
                      activeJob.status !== 'done' && (
                        <Button
                          size="sm"
                          onClick={() => void runLoop(activeJob)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {activeJob.status === 'cancelled' ||
                          progress.processed > 0
                            ? 'Resume import'
                            : 'Start import'}
                        </Button>
                      )
                    )}
                    {activeJob.status === 'done' && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/api/import/${activeJob.id}/report?format=csv`}>
                          <Download className="mr-2 h-4 w-4" />
                          Download CSV
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report */}
          {activeJob.status === 'done' && (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle>Import report</CardTitle>
                  <CardDescription>
                    {(activeJob.report?.renames ?? []).length} slug renames,{' '}
                    {activeJob.report?.redirectsCreated ?? 0} redirects created.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['all', 'All'],
                      ['done', 'Imported'],
                      ['renamed', 'Renamed'],
                      ['skipped', 'Skipped'],
                      ['failed', 'Failed'],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={reportFilter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setReportFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeJob.report?.warnings?.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
                    <div className="font-semibold text-amber-800 dark:text-amber-300">
                      Warnings ({activeJob.report.warnings.length})
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {activeJob.report.warnings.slice(0, 20).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kind</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No items match this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((entry, idx) => (
                          <TableRow key={`${entry.kind}-${entry.wpId}-${idx}`}>
                            <TableCell className="capitalize">
                              <Badge variant="outline">{entry.kind}</Badge>
                            </TableCell>
                            <TableCell className="font-medium max-w-xs truncate">
                              {entry.title}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  entry.status === 'failed'
                                    ? 'destructive'
                                    : entry.status === 'skipped'
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {renamedIds.has(`${entry.kind}:${entry.wpId}`)
                                  ? 'renamed'
                                  : entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                              {entry.message || entry.newUrl || '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.dashboardUrl ? (
                                <Link
                                  href={entry.dashboardUrl}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  View
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recent import history */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate font-medium">
                      {job.sourceFilename || job.id}
                    </span>
                    <Badge
                      variant={
                        STATUS_BADGE[job.status as ImportJobStatus] ??
                        'secondary'
                      }
                    >
                      {job.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {job.progress.imported} imported · {job.progress.skipped}{' '}
                      skipped · {job.progress.failed} failed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={stepping}
                      onClick={() => {
                        setActiveJob(job);
                        if (job.status === 'done') {
                          void loadReport(job.id);
                        } else {
                          setReportEntries([]);
                        }
                      }}
                    >
                      {job.status === 'done' ? 'View report' : 'Open'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function OptionToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onChange={onCheckedChange}
      />
    </div>
  );
}
