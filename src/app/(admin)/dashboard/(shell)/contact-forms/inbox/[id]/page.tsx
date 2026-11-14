import { notFound } from 'next/navigation';
import Link from '@/components/atoms/next/link';
import { Download, FileText } from 'lucide-react';
import { AccessDenied } from '@/components/organisms/access-denied';
import { PageHeader } from '@/components/organisms/page-header';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { metaObject } from '@/lib/utils/metadata';
import { requirePermission } from '@/server/services/require-permission';
import { formsService } from '@/server/services/forms.service';
import { ArchiveButton } from '../_components/archive-button';

export const metadata = { ...metaObject('Submission') };

function formatSource(source?: {
  kind: string;
  name?: string;
  formName?: string;
  id?: string;
}) {
  if (!source) return null;
  const parts: string[] = [];
  if (source.kind === 'page') {
    parts.push(`Page: ${source.name || source.id}`);
  } else if (source.kind === 'post') {
    parts.push(`Post: ${source.name || source.id}`);
  } else if (source.kind === 'global') {
    parts.push(`Global Form: ${source.name || source.id}`);
  }
  if (source.formName) {
    parts.push(`Form: ${source.formName}`);
  }
  return parts.join(' · ') || `${source.kind}: ${source.id}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { allowed } = await requirePermission(PERMISSIONS.PAGES_EDIT);
  const { id } = await params;
  const breadcrumbs = [
    { title: 'Dashboard', href: PAGES.DASHBOARD.ROOT },
    { title: 'Form inbox', href: PAGES.DASHBOARD.CONTACT_FORMS_INBOX },
    { title: 'Submission', href: PAGES.DASHBOARD.CONTACT_FORM_SUBMISSION(id) },
  ];

  if (!allowed) {
    return (
      <>
        <PageHeader title="Submission" breadcrumbs={breadcrumbs} />
        <AccessDenied />
      </>
    );
  }

  const row = await formsService.get(id);
  if (!row) notFound();
  if (row.status === 'new') await formsService.markRead(id);

  const sourceText = formatSource(row.source as any);

  return (
    <>
      <PageHeader title="Submission" breadcrumbs={breadcrumbs}>
        {row.status !== 'archived' && <ArchiveButton id={row.id} />}
      </PageHeader>
      <div className="grid max-w-2xl gap-6">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {row.status === 'new' ? 'read' : row.status}
              {row.spam ? ' · spam' : ''}
            </dd>
          </div>
          {sourceText && (
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium">{sourceText}</dd>
            </div>
          )}
          {Object.entries(row.payload ?? {}).map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        </dl>

        {row.files && row.files.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Uploaded files</h3>
            <ul className="divide-y text-sm">
              {row.files.map((file, idx) => (
                <li
                  key={file.key || idx}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatBytes(file.size)})
                    </span>
                  </div>
                  <a
                    href={`/api/forms/files/${row.id}/${idx}`}
                    download={file.name}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {row.actionLog && row.actionLog.length > 0 && (
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Actions log</h3>
            <ul className="divide-y text-xs">
              {row.actionLog.map((item, idx) => (
                <li key={idx} className="space-y-0.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium uppercase tracking-wider text-muted-foreground">
                      {item.action}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        item.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : item.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.message && (
                    <p className="text-muted-foreground">{item.message}</p>
                  )}
                  {item.error && (
                    <p className="text-red-600 dark:text-red-400">
                      {item.error}
                    </p>
                  )}
                  {item.at && (
                    <p className="text-[10px] text-muted-foreground/70">
                      {new Date(item.at).toLocaleString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
