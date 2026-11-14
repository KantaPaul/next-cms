'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormAction } from '@/hooks/use-form-action';
import {
  type ConsentCategory,
  type ConsentSettings,
  consentSettingsSchema,
  DEFAULT_CONSENT_SETTINGS,
} from '@/lib/site-essentials-types';
import { updateConsentSettings } from '../../_modules/settings.actions';

const CATEGORY_OPTIONS: { value: ConsentCategory; label: string }[] = [
  { value: 'necessary', label: 'Necessary (always allowed)' },
  { value: 'functional', label: 'Functional' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'marketing', label: 'Marketing (default)' },
];

export function ConsentSettingsForm({
  initialValues,
}: {
  initialValues?: ConsentSettings | null;
}) {
  const router = useRouter();
  const defaults: ConsentSettings = {
    ...DEFAULT_CONSENT_SETTINGS,
    ...initialValues,
    customCodeCategories: {
      ...DEFAULT_CONSENT_SETTINGS.customCodeCategories,
      ...initialValues?.customCodeCategories,
    },
  };

  const form = useForm<ConsentSettings>({
    resolver: zodResolver(consentSettingsSchema) as any,
    defaultValues: defaults,
  });

  const { submit, isPending, error } = useFormAction(
    async (data: ConsentSettings) => {
      const res = await updateConsentSettings(data);
      return res as Record<string, unknown>;
    },
    {
      onSuccess: () => {
        toast.success('Cookie consent settings saved.');
        router.refresh();
      },
    }
  );

  const version = form.watch('version');

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="max-w-4xl space-y-6"
    >
      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-steel-100 pb-4 dark:border-dark-300">
          <div>
            <h3 className="text-base font-semibold">Consent banner & gating</h3>
            <p className="mt-1 text-sm text-steel-500">
              Gate analytics, custom code, and third-party embeds (YouTube, Vimeo, Maps) behind visitor consent.
            </p>
          </div>
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  className="size-4 rounded border-steel-300 text-indigo-600"
                />
                <span>Enable consent banner</span>
              </label>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Compliance mode</Label>
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opt-in">
                      Opt-in (GDPR — block until accepted)
                    </SelectItem>
                    <SelectItem value="notice-only">
                      Notice-only (informational)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Banner position</Label>
            <Controller
              control={form.control}
              name="position"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-bar">Bottom bar</SelectItem>
                    <SelectItem value="bottom-left">Bottom left card</SelectItem>
                    <SelectItem value="bottom-right">Bottom right card</SelectItem>
                    <SelectItem value="center">Centered modal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Policy version</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                {...form.register('version', { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Bump version to ask all visitors for consent again"
                onClick={() =>
                  form.setValue('version', Number(version || 1) + 1, {
                    shouldDirty: true,
                  })
                }
              >
                <RefreshCw className="me-1 size-3.5" />
                Bump
              </Button>
            </div>
            <p className="mt-1 text-xs text-steel-500">
              Bumping the version prompts returning visitors again.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100 space-y-4">
        <h3 className="text-base font-semibold">Banner copy & links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Heading</Label>
            <Input className="mt-1" {...form.register('title')} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <textarea
              rows={3}
              {...form.register('description')}
              className="mt-1 w-full rounded-md border border-steel-200 bg-transparent px-3 py-2 text-sm dark:border-dark-300"
            />
          </div>
          <div>
            <Label>Privacy policy URL</Label>
            <Input
              className="mt-1"
              placeholder="/privacy"
              {...form.register('privacyPolicyUrl')}
            />
          </div>
          <div>
            <Label>Privacy policy link label</Label>
            <Input
              className="mt-1"
              placeholder="Privacy Policy"
              {...form.register('privacyPolicyLabel')}
            />
          </div>
          <div>
            <Label>Accept all label</Label>
            <Input className="mt-1" {...form.register('acceptAllLabel')} />
          </div>
          <div>
            <Label>Reject all label</Label>
            <Input className="mt-1" {...form.register('rejectAllLabel')} />
          </div>
          <div>
            <Label>Customize label</Label>
            <Input className="mt-1" {...form.register('customizeLabel')} />
          </div>
          <div>
            <Label>Save preferences label</Label>
            <Input className="mt-1" {...form.register('saveLabel')} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100 space-y-4">
        <div>
          <h3 className="text-base font-semibold">
            Custom code snippet categories
          </h3>
          <p className="mt-1 text-sm text-steel-500">
            Choose which consent category each custom code slot waits for before executing.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Head HTML (&lt;head&gt;)</Label>
            <Controller
              control={form.control}
              name="customCodeCategories.headHtml"
              render={({ field }) => (
                <Select
                  value={field.value ?? 'marketing'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Body start HTML</Label>
            <Controller
              control={form.control}
              name="customCodeCategories.bodyStartHtml"
              render={({ field }) => (
                <Select
                  value={field.value ?? 'marketing'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Body end HTML</Label>
            <Controller
              control={form.control}
              name="customCodeCategories.bodyEndHtml"
              render={({ field }) => (
                <Select
                  value={field.value ?? 'marketing'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="me-2 size-4 animate-spin" /> : <Save className="me-2 size-4" />}
          Save consent settings
        </Button>
      </div>
    </form>
  );
}
