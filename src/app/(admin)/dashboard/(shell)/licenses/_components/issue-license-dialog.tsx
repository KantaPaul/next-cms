'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/input';
import { issueLicenseAction } from '../_modules/licenses.actions';
import {
  type IssueLicenseFormValues,
  issueLicenseFormSchema,
} from '../_modules/licenses.schemas';

interface IssueLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueLicenseDialog({
  open,
  onOpenChange,
}: IssueLicenseDialogProps) {
  const router = useRouter();
  const [issuedPlaintextKey, setIssuedPlaintextKey] = useState<string | null>(
    null
  );
  const [hasCopied, setHasCopied] = useState(false);

  const form = useForm<IssueLicenseFormValues>({
    resolver: zodResolver(issueLicenseFormSchema),
    defaultValues: {
      ownerUserId: '',
      expiresInDays: 365,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleClose = () => {
    onOpenChange(false);
    setIssuedPlaintextKey(null);
    form.reset({
      ownerUserId: '',
      expiresInDays: 365,
    });
    router.refresh();
  };

  const onSubmit = async (values: IssueLicenseFormValues) => {
    try {
      const res = await issueLicenseAction({
        ownerUserId: values.ownerUserId?.trim() || undefined,
        expiresInDays: values.expiresInDays,
      });

      if (res && 'plaintextKey' in res && res.plaintextKey) {
        setIssuedPlaintextKey(res.plaintextKey);
        toast.success('License issued successfully');
      } else {
        toast.error('Failed to issue license');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error issuing license');
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

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue New License</DialogTitle>
          <DialogDescription>
            Create a single-installation license for next-cms. The plaintext
            license key will be displayed once upon creation.
          </DialogDescription>
        </DialogHeader>

        {issuedPlaintextKey ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Save this key now
              </div>
              Only the SHA-256 hash of this key is stored in the database. You
              will not be able to view this plaintext key again after closing
              this window.
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                License Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={issuedPlaintextKey}
                  className="w-full select-all rounded-lg border border-slate-300 bg-slate-50 p-2.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyKeyToClipboard}
                  className="shrink-0 gap-1.5"
                >
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {hasCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              <FormField
                control={form.control}
                name="ownerUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner User ID (optional)</FormLabel>
                    <FormControl>
                      <FormInput
                        placeholder="e.g. user_12345..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      User ID from the accounts table to link this license to an
                      owner.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validity Period (Days)</FormLabel>
                    <FormControl>
                      <FormInput
                        type="number"
                        min="1"
                        {...field}
                        value={field.value ?? 365}
                        onChange={e =>
                          field.onChange(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Generating...' : 'Issue License'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
