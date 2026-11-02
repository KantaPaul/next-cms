'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Check, Copy, KeyRound, Plus, Search, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { issueLicenseAction } from '../_modules/licenses.actions';

export interface LicenseListItem {
  id: string;
  publicId: string;
  keyPrefix: string;
  productId: string;
  status: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  issuedAt: Date | string;
  activatedAt: Date | string | null;
  expiresAt: Date | string | null;
  reassignmentCount: number;
  lastValidatedAt: Date | string | null;
}

interface LicensesListProps {
  items: LicenseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentSearch?: string;
  currentStatus?: string;
}

export function LicensesList({
  items,
  total,
  page,
  limit,
  totalPages,
  currentSearch = '',
  currentStatus = '',
}: LicensesListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(365);
  const [issuedPlaintextKey, setIssuedPlaintextKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (currentStatus) params.set('status', currentStatus);
    params.set('page', '1');
    router.push(`/dashboard/licenses?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (status) params.set('status', status);
    params.set('page', '1');
    router.push(`/dashboard/licenses?${params.toString()}`);
  };

  const handleIssueLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await issueLicenseAction({
        ownerUserId: ownerUserId.trim() || undefined,
        expiresInDays: Number(expiresInDays) || 365,
      });
      if (res && 'plaintextKey' in res && res.plaintextKey) {
        setIssuedPlaintextKey(res.plaintextKey);
        toast.success('License issued successfully');
      } else {
        toast.error('Failed to issue license');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error issuing license');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKeyToClipboard = async () => {
    if (!issuedPlaintextKey) return;
    try {
      await navigator.clipboard.writeText(issuedPlaintextKey);
      setHasCopied(true);
      toast.success('License key copied to clipboard');
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error('Failed to copy key');
    }
  };

  const closeIssueModal = () => {
    setIsIssueOpen(false);
    setIssuedPlaintextKey(null);
    setOwnerUserId('');
    setExpiresInDays(365);
    router.refresh();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Suspended
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Revoked
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Search, filters, issue button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search public ID or prefix..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={currentStatus}
            onChange={e => handleStatusFilter(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>

          <Button onClick={() => setIsIssueOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Issue License
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">License ID</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Owner</th>
                <th className="px-6 py-3 font-semibold">Issued / Expires</th>
                <th className="px-6 py-3 font-semibold">Reassignments</th>
                <th className="px-6 py-3 font-semibold">Last Validated</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <KeyRound className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    No licenses found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map(lic => (
                  <tr key={lic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      <Link
                        href={`/dashboard/licenses/${lic.publicId}`}
                        className="hover:underline text-primary"
                      >
                        {lic.publicId}
                      </Link>
                      <div className="text-xs text-slate-400 font-sans mt-0.5">
                        Product: {lic.productId} (max 1 install)
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(lic.status)}</td>
                    <td className="px-6 py-4">
                      {lic.ownerName ? (
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {lic.ownerName}
                          </div>
                          <div className="text-xs text-slate-500">{lic.ownerEmail}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                      <div>Issued: {format(new Date(lic.issuedAt), 'yyyy-MM-dd')}</div>
                      {lic.expiresAt && (
                        <div className="text-slate-400">
                          Expires: {format(new Date(lic.expiresAt), 'yyyy-MM-dd')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{lic.reassignmentCount}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {lic.lastValidatedAt
                        ? format(new Date(lic.lastValidatedAt), 'yyyy-MM-dd HH:mm')
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/licenses/${lic.publicId}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {items.length} of {total} licenses
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (search) params.set('q', search);
                  if (currentStatus) params.set('status', currentStatus);
                  params.set('page', String(page - 1));
                  router.push(`/dashboard/licenses?${params.toString()}`);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (search) params.set('q', search);
                  if (currentStatus) params.set('status', currentStatus);
                  params.set('page', String(page + 1));
                  router.push(`/dashboard/licenses?${params.toString()}`);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Issue License Dialog */}
      <Dialog open={isIssueOpen} onOpenChange={open => !open && closeIssueModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue New License</DialogTitle>
            <DialogDescription>
              Create a single-installation license for next-cms. The plaintext license key will be
              displayed once upon creation.
            </DialogDescription>
          </DialogHeader>

          {issuedPlaintextKey ? (
            <div className="space-y-4 py-2">
              <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-900 dark:text-amber-200 text-xs">
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Save this key now
                </div>
                Only the SHA-256 hash of this key is stored in the database. You will not be able to view
                this plaintext key again after closing this window.
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  License Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={issuedPlaintextKey}
                    className="w-full font-mono text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyKeyToClipboard}
                    className="shrink-0 gap-1.5"
                  >
                    {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {hasCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button onClick={closeIssueModal} className="w-full">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleIssueLicense} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Owner User ID (optional)
                </label>
                <FormInput
                  placeholder="e.g. user_12345..."
                  value={ownerUserId}
                  onChange={e => setOwnerUserId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Validity Period (Days)
                </label>
                <FormInput
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={e => setExpiresInDays(Number(e.target.value))}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsIssueOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Generating...' : 'Issue License'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
