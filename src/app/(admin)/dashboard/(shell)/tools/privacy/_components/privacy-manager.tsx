'use client';

import { format } from 'date-fns';
import {
  AlertTriangle,
  Download,
  Loader2,
  Mail,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
import type { PrivacyDataPlan } from '@/server/services/privacy.service';
import {
  emailPrivacyExportLinkAction,
  erasePrivacyDataAction,
  lookupPrivacyDataAction,
  rejectPrivacyRequestAction,
} from '../_modules/privacy.actions';

export type PrivacyRequestRow = {
  id: string;
  email: string;
  type: 'export' | 'erase';
  status: 'pending_confirmation' | 'confirmed' | 'completed' | 'rejected';
  visitorId: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  notes: string | null;
};

const STATUS_BADGE: Record<
  PrivacyRequestRow['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending_confirmation: { label: 'Pending confirmation', variant: 'outline' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function PrivacyManager({
  initialRequests,
}: {
  initialRequests: PrivacyRequestRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lookupEmail, setLookupEmail] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PrivacyDataPlan | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [commentMode, setCommentMode] = useState<'anonymize' | 'delete'>(
    'anonymize'
  );

  const inspectEmail = (
    email: string,
    visitorId?: string | null,
    requestId?: string | null
  ) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        const res = (await lookupPrivacyDataAction({
          email: trimmed,
          visitorId: visitorId ?? null,
        })) as PrivacyDataPlan;
        setPlan(res);
        setActiveRequestId(requestId ?? null);
        setLookupEmail(trimmed);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not inspect email.'
        );
      }
    });
  };

  const handleErase = () => {
    if (!plan) return;
    startTransition(async () => {
      try {
        const res = (await erasePrivacyDataAction({
          email: plan.email,
          visitorId: plan.visitorId,
          requestId: activeRequestId,
          commentMode,
        })) as {
          ok: boolean;
          erased: {
            formSubmissions: number;
            files: number;
            comments: number;
            pageViews: number;
          };
        };
        setEraseOpen(false);
        toast.success(
          `Erased ${res.erased.formSubmissions} submission(s), ${res.erased.files} file(s), ${res.erased.pageViews} page view(s); ${commentMode === 'delete' ? 'deleted' : 'anonymized'} ${res.erased.comments} comment(s).`
        );
        const refreshed = (await lookupPrivacyDataAction({
          email: plan.email,
          visitorId: plan.visitorId,
        })) as PrivacyDataPlan;
        setPlan(refreshed);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not erase data.'
        );
      }
    });
  };

  const handleEmailExport = (requestId: string) => {
    startTransition(async () => {
      try {
        const res = (await emailPrivacyExportLinkAction({ requestId })) as {
          sent: boolean;
          downloadUrl: string;
        };
        toast.success(
          res.sent
            ? 'One-time export link emailed to the requester.'
            : 'Export created (mail not configured; link logged in server console).'
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not create export link.'
        );
      }
    });
  };

  const handleReject = (requestId: string) => {
    startTransition(async () => {
      try {
        await rejectPrivacyRequestAction({ requestId });
        toast.success('Request marked as rejected.');
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not reject request.'
        );
      }
    });
  };

  const downloadHref = activeRequestId
    ? `/api/dashboard/privacy/export?requestId=${encodeURIComponent(activeRequestId)}`
    : plan
      ? `/api/dashboard/privacy/export?email=${encodeURIComponent(plan.email)}`
      : '#';

  return (
    <div className="space-y-8">
      {/* Direct lookup */}
      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <h2 className="text-base font-semibold">Look up data by email</h2>
        <p className="mt-1 text-sm text-steel-500">
          Preview all form submissions, uploaded files, comments, and staff accounts matching an email address before exporting or erasing.
        </p>
        <form
          onSubmit={e => {
            e.preventDefault();
            inspectEmail(lookupEmail, null, null);
          }}
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <Input
            type="email"
            required
            value={lookupEmail}
            onChange={e => setLookupEmail(e.target.value)}
            placeholder="person@example.com"
            className="max-w-sm"
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="me-2 size-4 animate-spin" />
            ) : (
              <Search className="me-2 size-4" />
            )}
            Look up data
          </Button>
        </form>
      </div>

      {/* Preview / action panel */}
      {plan && (
        <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-steel-100 pb-4 dark:border-dark-300">
            <div>
              <h3 className="text-base font-semibold">
                Data found for <span className="font-mono">{plan.email}</span>
              </h3>
              <p className="mt-1 text-xs text-steel-500">
                {plan.visitorId
                  ? `Linked browser visitor ID (${plan.visitorId}) included from confirmed request.`
                  : 'No browser visitor ID linked (page views are only matched from confirmed browser requests).'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={downloadHref}>
                  <Download className="me-1.5 size-4" />
                  Export ZIP
                </a>
              </Button>
              {activeRequestId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleEmailExport(activeRequestId)}
                >
                  <Mail className="me-1.5 size-4" />
                  Email one-time link
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={
                  isPending ||
                  (plan.counts.formSubmissions === 0 &&
                    plan.counts.comments === 0 &&
                    plan.counts.pageViews === 0)
                }
                onClick={() => setEraseOpen(true)}
              >
                <Trash2 className="me-1.5 size-4" />
                Erase personal data
              </Button>
            </div>
          </div>

          {plan.staffUsers.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <strong>Staff account flagged for manual handling:</strong>{' '}
                {plan.staffUsers
                  .map(u => `${u.name || u.email} (${u.roleName || 'Staff'})`)
                  .join(', ')}
                . Staff user accounts are never erased automatically.
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-steel-100 p-3 dark:border-dark-300">
              <p className="text-xs text-steel-500">Form submissions</p>
              <p className="mt-1 text-xl font-semibold">
                {plan.counts.formSubmissions}
              </p>
            </div>
            <div className="rounded-md border border-steel-100 p-3 dark:border-dark-300">
              <p className="text-xs text-steel-500">Uploaded files</p>
              <p className="mt-1 text-xl font-semibold">{plan.counts.files}</p>
            </div>
            <div className="rounded-md border border-steel-100 p-3 dark:border-dark-300">
              <p className="text-xs text-steel-500">Comments</p>
              <p className="mt-1 text-xl font-semibold">
                {plan.counts.comments}
              </p>
            </div>
            <div className="rounded-md border border-steel-100 p-3 dark:border-dark-300">
              <p className="text-xs text-steel-500">Linked page views</p>
              <p className="mt-1 text-xl font-semibold">
                {plan.counts.pageViews}
              </p>
            </div>
          </div>

          {plan.formSubmissions.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Form submissions</h4>
              <div className="space-y-2">
                {plan.formSubmissions.map(sub => (
                  <div
                    key={sub.id}
                    className="rounded-md border border-steel-100 p-3 text-xs dark:border-dark-300"
                  >
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span>{sub.formName || 'Form submission'}</span>
                      <span className="text-steel-500">
                        {format(new Date(sub.createdAt), 'PPp')}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-steel-500">
                      {Object.entries(sub.payload)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                    {sub.files.length > 0 && (
                      <p className="mt-1 text-steel-500">
                        Files: {sub.files.map(f => f.name).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.comments.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Comments</h4>
              <div className="space-y-2">
                {plan.comments.map(c => (
                  <div
                    key={c.id}
                    className="rounded-md border border-steel-100 p-3 text-xs dark:border-dark-300"
                  >
                    <div className="flex items-center justify-between gap-2 font-medium">
                      <span>
                        {c.authorName} ({c.status})
                      </span>
                      <span className="text-steel-500">
                        {format(new Date(c.createdAt), 'PPp')}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-steel-600 dark:text-steel-300">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmed requests list */}
      <div className="rounded-lg border border-steel-200 bg-white dark:border-dark-300 dark:bg-dark-100">
        <div className="border-b border-steel-100 px-6 py-4 dark:border-dark-300">
          <h2 className="text-base font-semibold">
            Confirmed privacy requests ({initialRequests.length})
          </h2>
        </div>
        {initialRequests.length === 0 ? (
          <p className="p-6 text-sm text-steel-500">
            No confirmed privacy requests yet. Visitors can submit requests through any Privacy Request block.
          </p>
        ) : (
          <div className="divide-y divide-steel-100 dark:divide-dark-300">
            {initialRequests.map(req => {
              const badge = STATUS_BADGE[req.status];
              return (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {req.email}
                      </span>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {req.type}
                      </Badge>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-steel-500">
                      Confirmed{' '}
                      {req.confirmedAt
                        ? format(new Date(req.confirmedAt), 'PPp')
                        : format(new Date(req.createdAt), 'PPp')}
                      {req.visitorId ? ' · Browser visitor ID linked' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        inspectEmail(req.email, req.visitorId, req.id)
                      }
                    >
                      <Search className="me-1.5 size-3.5" />
                      Preview data
                    </Button>
                    {req.type === 'export' && req.status === 'confirmed' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleEmailExport(req.id)}
                      >
                        <Mail className="me-1.5 size-3.5" />
                        Email export
                      </Button>
                    )}
                    {req.status === 'confirmed' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReject(req.id)}
                      >
                        <XCircle className="me-1.5 size-3.5" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-600" />
              Confirm personal data erasure
            </DialogTitle>
            <DialogDescription>
              This action permanently modifies records for{' '}
              <span className="font-mono font-semibold">{plan?.email}</span> and
              will be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          {plan && (
            <div className="space-y-4 text-sm">
              <ul className="list-disc space-y-1 ps-5 text-xs text-steel-600 dark:text-steel-300">
                <li>
                  Delete <strong>{plan.counts.formSubmissions}</strong> form
                  submission(s) and <strong>{plan.counts.files}</strong>{' '}
                  uploaded file(s) from storage
                </li>
                <li>
                  Process <strong>{plan.counts.comments}</strong> comment(s)
                </li>
                <li>
                  Delete <strong>{plan.counts.pageViews}</strong> linked page
                  view(s)
                </li>
                {plan.staffUsers.length > 0 && (
                  <li className="text-amber-700 dark:text-amber-400">
                    <strong>{plan.staffUsers.length}</strong> staff account(s)
                    will NOT be deleted automatically
                  </li>
                )}
              </ul>

              <div className="space-y-2">
                <Label>How should matching comments be handled?</Label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="commentMode"
                      checked={commentMode === 'anonymize'}
                      onChange={() => setCommentMode('anonymize')}
                    />
                    <span>
                      Anonymize (&quot;Deleted user&quot;, clear email, keep
                      comment text)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="commentMode"
                      checked={commentMode === 'delete'}
                      onChange={() => setCommentMode('delete')}
                    />
                    <span>Permanently delete matching comments</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEraseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleErase}
            >
              {isPending && <Loader2 className="me-2 size-4 animate-spin" />}
              Confirm erase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
