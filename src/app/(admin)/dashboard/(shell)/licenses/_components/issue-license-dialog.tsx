'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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

const issueLicenseSchema = z.object({
  ownerUserId: z.string().optional(),
  expiresInDays: z
    .number({ message: 'Validity period must be a number' })
    .int('Must be a whole number of days')
    .min(1, 'Validity period must be at least 1 day'),
});

type IssueLicenseFormValues = z.infer<typeof issueLicenseSchema>;

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
    resolver: zodResolver(issueLicenseSchema),
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
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-900 dark:text-amber-200 text-xs">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Save this key now
              </div>
              Only the SHA-256 hash of this key is stored in the database. You
              will not be able to view this plaintext key again after closing
              this window.
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
                  {hasCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                      User ID from the accounts table to link this license to an owner.
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
