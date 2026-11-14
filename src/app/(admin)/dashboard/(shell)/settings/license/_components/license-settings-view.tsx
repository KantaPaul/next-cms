'use client';

import { useId, useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormItem, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { LicenseSettings } from '@/db/schemas/licenses.schema';
import {
  manageLicenseFormSchema,
  licensePolicyFormSchema,
  type ManageLicenseFormInput,
  type LicensePolicyFormInput,
} from '../../_modules/settings.schemas';
import {
  updateManagedLicense,
  deactivateManagedLicense,
  updateLicensePolicy,
} from '../../_modules/settings.actions';

interface LicenseSettingsViewProps {
  licenseSettings: LicenseSettings;
  envInfo: {
    role: string;
    enforcement: string;
    envLicenseKey?: string;
    envAuthorityUrl?: string;
  };
}

export function LicenseSettingsView({
  licenseSettings,
  envInfo,
}: LicenseSettingsViewProps) {
  const [showKey, setShowKey] = useState(false);
  const [isManagePending, startManageTransition] = useTransition();
  const [isPolicyPending, startPolicyTransition] = useTransition();
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Manage License Form
  const initialKey =
    licenseSettings.managedLicenseKey || envInfo.envLicenseKey || '';
  const initialAuthorityUrl =
    licenseSettings.authorityUrl || envInfo.envAuthorityUrl || '';

  const manageForm = useForm<ManageLicenseFormInput>({
    resolver: zodResolver(manageLicenseFormSchema),
    defaultValues: {
      licenseKey: initialKey,
      authorityUrl: initialAuthorityUrl,
    },
  });

  // Policy Form
  const policyForm = useForm<LicensePolicyFormInput>({
    resolver: zodResolver(licensePolicyFormSchema),
    defaultValues: {
      heartbeatIntervalSeconds: licenseSettings.heartbeatIntervalSeconds ?? 86400,
      gracePeriodSeconds: licenseSettings.gracePeriodSeconds ?? 259200,
      defaultExpiryDays: licenseSettings.defaultExpiryDays ?? 365,
      reassignmentCooldownHours: licenseSettings.reassignmentCooldownHours ?? 24,
      maxReassignments: licenseSettings.maxReassignments ?? 5,
      rateLimitMaxAttempts: licenseSettings.rateLimitMaxAttempts ?? 10,
      rateLimitWindowMinutes: licenseSettings.rateLimitWindowMinutes ?? 15,
      notifyOnConflict: licenseSettings.notifyOnConflict ?? true,
      notifyOnRevocation: licenseSettings.notifyOnRevocation ?? true,
      notifyOnExpiryWindowDays: licenseSettings.notifyOnExpiryWindowDays ?? 14,
    },
  });

  const onSaveManageLicense = (data: ManageLicenseFormInput) => {
    startManageTransition(async () => {
      try {
        const res = await updateManagedLicense(data);
        if (res && 'ok' in res && !res.ok) {
          toast.error(res.error || 'Failed to activate license');
        } else {
          toast.success('License activated and saved successfully');
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this license binding?')) {
      return;
    }
    setIsDeactivating(true);
    try {
      const res = await deactivateManagedLicense({});
      if (res && 'ok' in res && !res.ok) {
        toast.error(res.error || 'Failed to deactivate license');
      } else {
        toast.success('License binding deactivated');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDeactivating(false);
    }
  };

  const onSavePolicy = (data: LicensePolicyFormInput) => {
    startPolicyTransition(async () => {
      try {
        const res = await updateLicensePolicy(data);
        if (res && 'ok' in res && !res.ok) {
          toast.error(res.error || 'Failed to update licensing policy');
        } else {
          toast.success('Licensing policy saved successfully');
          policyForm.reset(data);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const currentStatus =
    licenseSettings.managedLicenseStatus ||
    (initialKey ? 'active' : 'inactive');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-10 pb-12">
      {/* --------------------------------------------------------- */}
      {/* AREA 1: MANAGE LICENSE AREA                               */}
      {/* --------------------------------------------------------- */}
      <Card className="border border-steel-200 dark:border-dark-300">
        <CardHeader className="border-b border-steel-100 pb-5 dark:border-dark-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Manage License</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Active deployment license key, activation status, and instance binding.
              </CardDescription>
            </div>
            <div>
              {currentStatus === 'active' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active License
                </Badge>
              )}
              {currentStatus === 'pending' && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 px-3 py-1 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Activation
                </Badge>
              )}
              {currentStatus === 'expired' && (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1 font-semibold">
                  <XCircle className="h-3.5 w-3.5" />
                  Expired
                </Badge>
              )}
              {currentStatus === 'revoked' && (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1 font-semibold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Revoked
                </Badge>
              )}
              {currentStatus === 'inactive' && (
                <Badge variant="outline" className="text-steel-600 dark:text-steel-400 gap-1.5 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-steel-400" />
                  Unlicensed / Inactive
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* License Overview Details */}
        <div className="bg-steel-50/50 dark:bg-dark-200/40 px-6 py-4 border-b border-steel-100 dark:border-dark-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-steel-500 block uppercase tracking-wider">
                Product
              </span>
              <span className="font-semibold text-foreground">next-cms</span>
              <span className="text-xs text-steel-500 ms-1.5">(Single-Install)</span>
            </div>
            <div>
              <span className="text-xs font-medium text-steel-500 block uppercase tracking-wider">
                Deployment Role
              </span>
              <span className="capitalize font-medium text-foreground">
                {envInfo.role || 'installation'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-steel-500 block uppercase tracking-wider">
                Bound Instance
              </span>
              <span className="font-mono text-xs text-steel-700 dark:text-steel-300 truncate block">
                {licenseSettings.managedInstallationPublicId || 'inst_default'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-steel-500 block uppercase tracking-wider">
                Last Validated
              </span>
              <span className="text-xs text-foreground">
                {licenseSettings.managedLastCheckedAt
                  ? format(new Date(licenseSettings.managedLastCheckedAt), 'yyyy-MM-dd HH:mm')
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Manage License Form */}
        <form onSubmit={manageForm.handleSubmit(onSaveManageLicense)}>
          <CardContent className="pt-6 space-y-5">
            <Controller
              control={manageForm.control}
              name="licenseKey"
              render={({ field, fieldState }) => {
                const id = useId();
                return (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor={id} className="text-sm font-semibold flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-steel-500" />
                      License Key
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id={id}
                        type={showKey ? 'text' : 'password'}
                        placeholder="ncms_lic_..."
                        className="font-mono text-sm pe-20"
                        {...field}
                      />
                      <div className="absolute end-1 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-steel-500 hover:text-foreground"
                          onClick={() => setShowKey(!showKey)}
                          title={showKey ? 'Hide key' : 'Show key'}
                        >
                          {showKey ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-steel-500 hover:text-foreground"
                            onClick={() => copyToClipboard(field.value)}
                            title="Copy key"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-steel-500 block">
                      Enter the 32-character key starting with{' '}
                      <code className="text-primary font-mono">ncms_lic_</code>.
                    </span>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                );
              }}
            />

            <Controller
              control={manageForm.control}
              name="authorityUrl"
              render={({ field, fieldState }) => {
                const id = useId();
                return (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor={id} className="text-sm font-semibold flex items-center gap-1.5">
                      <Server className="h-4 w-4 text-steel-500" />
                      License Authority URL
                    </Label>
                    <Input
                      id={id}
                      type="url"
                      placeholder="https://licenses.yourdomain.com"
                      className="text-sm"
                      {...field}
                      value={field.value ?? ''}
                    />
                    <span className="text-xs text-steel-500 block">
                      Vendor licensing authority endpoint for remote token check-ins and validation.
                    </span>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                );
              }}
            />
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-steel-100 pt-5 dark:border-dark-300">
            <div>
              {currentStatus === 'active' && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  onClick={handleDeactivate}
                  disabled={isDeactivating || isManagePending}
                >
                  {isDeactivating ? (
                    <Loader2 className="h-4 w-4 animate-spin me-1.5" />
                  ) : null}
                  Deactivate License
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isManagePending || isDeactivating}
              className="gap-2"
            >
              {isManagePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save & Activate License
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* --------------------------------------------------------- */}
      {/* AREA 2: LICENSING POLICY AREA                             */}
      {/* --------------------------------------------------------- */}
      <Card className="border border-steel-200 dark:border-dark-300">
        <CardHeader className="border-b border-steel-100 pb-5 dark:border-dark-300">
          <CardTitle className="text-lg">Licensing Policy</CardTitle>
          <CardDescription className="mt-1">
            Authority policy for single-install licenses. Max installations is fixed at 1
            and enforcement cannot be turned off in production.
          </CardDescription>
        </CardHeader>

        <form onSubmit={policyForm.handleSubmit(onSavePolicy)}>
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Controller
                control={policyForm.control}
                name="heartbeatIntervalSeconds"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Heartbeat interval (seconds)
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="60"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        How often installations check in (default: 86400s / 24h).
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <Controller
                control={policyForm.control}
                name="gracePeriodSeconds"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Grace period (seconds, max 604800s / 7d)
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="0"
                        max="604800"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        Offline leeway before enforcement fails closed (capped at 7 days).
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <Controller
                control={policyForm.control}
                name="defaultExpiryDays"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Default expiry (days)
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="1"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        Standard validity duration for newly issued licenses.
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <Controller
                control={policyForm.control}
                name="reassignmentCooldownHours"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Reassignment cooldown (hours)
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="0"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        Minimum waiting period between server migrations.
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <Controller
                control={policyForm.control}
                name="maxReassignments"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Max reassignments per license
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="0"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        Maximum allowed hardware/server transfers per license.
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <Controller
                control={policyForm.control}
                name="rateLimitMaxAttempts"
                render={({ field, fieldState }) => {
                  const id = useId();
                  return (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor={id} className="text-sm font-medium">
                        Rate limit max attempts
                      </Label>
                      <Input
                        id={id}
                        type="number"
                        min="1"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value, 10))}
                      />
                      <span className="text-xs text-steel-500 block">
                        Max activation attempts per IP window.
                      </span>
                      {fieldState.error && (
                        <FormMessage>{fieldState.error.message}</FormMessage>
                      )}
                    </FormItem>
                  );
                }}
              />

              <div className="sm:col-span-2 pt-4 border-t border-steel-100 dark:border-dark-300">
                <div className="text-xs font-semibold uppercase text-steel-500 tracking-wider mb-3">
                  Notification & Abuse Policies
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Controller
                    control={policyForm.control}
                    name="notifyOnConflict"
                    render={({ field }) => {
                      const id = useId();
                      return (
                        <label
                          htmlFor={id}
                          className="flex items-center gap-2.5 p-3 rounded-lg border border-steel-200 dark:border-dark-300 cursor-pointer hover:bg-steel-50/50 dark:hover:bg-dark-200/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={id}
                            checked={field.value ?? true}
                            onChange={e => field.onChange(e.target.checked)}
                            className="rounded border-steel-300 dark:border-dark-300 text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-xs font-medium">
                            Alert on second-installation attempt conflict
                          </span>
                        </label>
                      );
                    }}
                  />

                  <Controller
                    control={policyForm.control}
                    name="notifyOnRevocation"
                    render={({ field }) => {
                      const id = useId();
                      return (
                        <label
                          htmlFor={id}
                          className="flex items-center gap-2.5 p-3 rounded-lg border border-steel-200 dark:border-dark-300 cursor-pointer hover:bg-steel-50/50 dark:hover:bg-dark-200/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            id={id}
                            checked={field.value ?? true}
                            onChange={e => field.onChange(e.target.checked)}
                            className="rounded border-steel-300 dark:border-dark-300 text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-xs font-medium">
                            Alert on license revocation
                          </span>
                        </label>
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-end gap-3 border-t border-steel-100 pt-5 dark:border-dark-300">
            <Button
              type="button"
              variant="ghost"
              disabled={!policyForm.formState.isDirty || isPolicyPending}
              onClick={() => policyForm.reset()}
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={isPolicyPending}
              className="gap-2"
            >
              {isPolicyPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Policy
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
