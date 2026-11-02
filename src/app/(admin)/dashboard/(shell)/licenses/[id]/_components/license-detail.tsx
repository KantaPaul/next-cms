'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CheckCircle,
  Copy,
  Key,
  Laptop,
  Power,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
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
import {
  suspendLicenseAction,
  revokeLicenseAction,
  renewLicenseAction,
  reassignLicenseAction,
  adminDeactivateLicenseAction,
} from '../../_modules/licenses.actions';

interface LicenseDetailProps {
  license: {
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
    maxInstallations: number;
    currentInstallationId: string | null;
    lastValidatedAt: Date | string | null;
    lastValidationResult: string | null;
    reassignmentCount: number;
    createdAt: Date | string;
  };
  activeInstallation: {
    id: string;
    publicId: string;
    publicKey: string;
    status: string;
    lastSeenAt: Date | string;
  } | null;
  events: Array<{
    id: string;
    type: string;
    outcome: string;
    reason: string | null;
    actorId: string | null;
    ipAddress: string | null;
    timestamp: Date | string;
    installationPublicId: string | null;
  }>;
}

export function LicenseDetailView({
  license,
  activeInstallation,
  events,
}: LicenseDetailProps) {
  const router = useRouter();

  // Action dialog states
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewDays, setRenewDays] = useState(365);

  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handlers
  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      await renewLicenseAction({
        licenseId: license.publicId,
        daysToAdd: Number(renewDays) || 365,
      });
      toast.success('License renewed');
      setIsRenewOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Renew failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async () => {
    setIsSubmitting(true);
    try {
      await suspendLicenseAction({
        licenseId: license.publicId,
        reason: suspendReason.trim() || undefined,
      });
      toast.success('License suspended');
      setIsSuspendOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suspend failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    setIsSubmitting(true);
    try {
      await revokeLicenseAction({
        licenseId: license.publicId,
        reason: revokeReason.trim() || undefined,
      });
      toast.success('License permanently revoked');
      setIsRevokeOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!newPublicKey.trim() || !reassignReason.trim()) {
      toast.error('Public key and reason are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await reassignLicenseAction({
        licenseId: license.publicId,
        newPublicKey: newPublicKey.trim(),
        reason: reassignReason.trim(),
      });
      toast.success('License reassigned to new installation');
      setIsReassignOpen(false);
      setNewPublicKey('');
      setReassignReason('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reassignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSubmitting(true);
    try {
      await adminDeactivateLicenseAction({
        licenseId: license.publicId,
        reason: deactivateReason.trim() || undefined,
      });
      toast.success('Installation binding deactivated');
      setIsDeactivateOpen(false);
      setDeactivateReason('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deactivation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pending Activation
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Suspended
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Revoked
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {license.publicId}
              </h1>
              {getStatusBadge(license.status)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Product: <span className="font-semibold text-slate-700 dark:text-slate-300">{license.productId}</span> •
              Fixed max installations: <span className="font-semibold text-slate-700 dark:text-slate-300">1</span> (database check constraint)
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenewOpen(true)}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renew
            </Button>

            {license.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSuspendOpen(true)}
                className="gap-1.5 text-orange-600 dark:text-orange-400 hover:text-orange-700"
              >
                <Power className="w-3.5 h-3.5" />
                Suspend
              </Button>
            )}

            {license.status !== 'revoked' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevokeOpen(true)}
                className="gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700"
              >
                <XCircle className="w-3.5 h-3.5" />
                Revoke
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReassignOpen(true)}
              className="gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Reassign
            </Button>
          </div>
        </div>
      </div>

      {/* Grid: Overview and Bound Installation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overview Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            License Details
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Owner User</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {license.ownerName ? `${license.ownerName} (${license.ownerEmail})` : 'Unassigned'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Key Prefix</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{license.keyPrefix}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Issued Date</span>
              <span className="text-slate-700 dark:text-slate-300">
                {format(new Date(license.issuedAt), 'yyyy-MM-dd HH:mm')}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Activated Date</span>
              <span className="text-slate-700 dark:text-slate-300">
                {license.activatedAt ? format(new Date(license.activatedAt), 'yyyy-MM-dd HH:mm') : 'Not yet activated'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Expires Date</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {license.expiresAt ? format(new Date(license.expiresAt), 'yyyy-MM-dd HH:mm') : 'Never'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Reassignment Count</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{license.reassignmentCount}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Last Validated Result</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {license.lastValidationResult || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Bound Installation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-primary" />
              Bound Installation (Max 1)
            </h2>
            {activeInstallation && (
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Bound & Active
              </span>
            )}
          </div>

          {activeInstallation ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Installation Public ID</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {activeInstallation.publicId}
                </span>
              </div>

              <div className="py-1.5 border-b border-slate-100 dark:border-slate-800">
                <div className="text-slate-500 mb-1">Ed25519 Public Key</div>
                <div className="font-mono text-[10px] p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 break-all select-all">
                  {activeInstallation.publicKey}
                </div>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Last Seen</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {format(new Date(activeInstallation.lastSeenAt), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeactivateOpen(true)}
                  className="w-full text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs"
                >
                  Deactivate Current Binding
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs">
              <Laptop className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              No installation is currently bound to this license.
            </div>
          )}
        </div>
      </div>

      {/* License Events History (R219 / R248) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Event History & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic verification, activation attempts, and admin actions (omits all secret tokens)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Timestamp</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Outcome</th>
                <th className="px-6 py-3 font-semibold">Installation</th>
                <th className="px-6 py-3 font-semibold">Reason / Details</th>
                <th className="px-6 py-3 font-semibold">IP / Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No events recorded yet.
                  </td>
                </tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {ev.type}
                    </td>
                    <td className="px-6 py-3">
                      {ev.outcome === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failure
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {ev.installationPublicId || '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {ev.reason || '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono">
                      {ev.actorId || ev.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Dialog */}
      <Dialog open={isRenewOpen} onOpenChange={setIsRenewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renew License</DialogTitle>
            <DialogDescription>
              Extend this license's validity period.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Days to extend from current expiry:
            </label>
            <FormInput
              type="number"
              min="1"
              value={renewDays}
              onChange={e => setRenewDays(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenew} disabled={isSubmitting}>
              {isSubmitting ? 'Renewing...' : 'Confirm Renewal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend License</DialogTitle>
            <DialogDescription>
              Suspended licenses fail token renewal on the next validate or heartbeat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Reason for suspension:
            </label>
            <FormInput
              placeholder="e.g. Payment pending or terms review"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={isSubmitting}>
              {isSubmitting ? 'Suspending...' : 'Suspend License'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke License</DialogTitle>
            <DialogDescription>
              Revocation permanently invalidates this license. This action is audited and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Reason for revocation:
            </label>
            <FormInput
              placeholder="e.g. Permanent cancellation or refund"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
              {isSubmitting ? 'Revoking...' : 'Confirm Permanent Revocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign License</DialogTitle>
            <DialogDescription>
              Reassignment revokes the current installation binding and binds a new Ed25519 public key.
              Enforces cooldown and maximum reassignment limits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                New Installation Ed25519 Public Key:
              </label>
              <textarea
                rows={4}
                className="w-full font-mono text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="-----BEGIN PUBLIC KEY-----..."
                value={newPublicKey}
                onChange={e => setNewPublicKey(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Reassignment:
              </label>
              <FormInput
                placeholder="e.g. Server migration or customer hardware change"
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={isSubmitting}>
              {isSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Installation</DialogTitle>
            <DialogDescription>
              Disconnects the current installation from this license.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Reason:
            </label>
            <FormInput
              placeholder="e.g. Customer decommissioned server"
              value={deactivateReason}
              onChange={e => setDeactivateReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isSubmitting}>
              {isSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
