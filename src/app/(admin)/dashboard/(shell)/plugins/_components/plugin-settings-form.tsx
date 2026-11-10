'use client';

import type { PluginSettingField } from '@nextcms/plugin-sdk/client';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { updatePluginSettingsAction } from '../_modules/plugins.actions';

export function PluginSettingsForm({
  pluginId,
  pluginName,
  description,
  fields,
  initialValues,
}: {
  pluginId: string;
  pluginName: string;
  description: string | null;
  fields: Record<string, PluginSettingField>;
  initialValues: Record<string, unknown>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [pending, startTransition] = useTransition();

  const entries = Object.entries(fields);

  const setField = (key: string, val: unknown) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await handleActionResponse(
        updatePluginSettingsAction({ pluginId, settings: values }),
        result => {
          const updated = (result as { values?: Record<string, unknown> })?.values;
          if (updated) setValues(updated);
          toast.success(`${pluginName} settings saved.`);
          router.refresh();
        }
      );
    });
  };

  if (entries.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{pluginName}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This plugin does not expose any configurable settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{pluginName} Settings</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-5">
          {entries.map(([key, meta]) => {
            const rawVal = values[key];
            const inputId = `plugin-setting-${pluginId}-${key}`;
            const fieldType = meta.secret
              ? 'password'
              : (meta.type ?? 'text');

            if (fieldType === 'boolean') {
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={inputId}>{meta.label}</Label>
                    {meta.description && (
                      <p className="text-xs text-muted-foreground">
                        {meta.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={inputId}
                    checked={Boolean(rawVal)}
                    onChange={checked => setField(key, checked)}
                  />
                </div>
              );
            }

            if (fieldType === 'textarea') {
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={inputId}>{meta.label}</Label>
                  <Textarea
                    id={inputId}
                    value={String(rawVal ?? '')}
                    placeholder={meta.placeholder}
                    onChange={e => setField(key, e.target.value)}
                  />
                  {meta.description && (
                    <p className="text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                  )}
                </div>
              );
            }

            if (fieldType === 'select' && meta.options) {
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={inputId}>{meta.label}</Label>
                  <select
                    id={inputId}
                    value={String(rawVal ?? '')}
                    onChange={e => setField(key, e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {meta.options.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {meta.description && (
                    <p className="text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={inputId}>{meta.label}</Label>
                <FormInput
                  id={inputId}
                  type={
                    fieldType === 'number'
                      ? 'number'
                      : fieldType === 'url'
                        ? 'url'
                        : meta.secret
                          ? 'password'
                          : 'text'
                  }
                  value={String(rawVal ?? '')}
                  placeholder={meta.placeholder}
                  autoComplete="off"
                  onChange={e =>
                    setField(
                      key,
                      fieldType === 'number'
                        ? e.target.value === ''
                          ? ''
                          : Number(e.target.value)
                        : e.target.value
                    )
                  }
                />
                {meta.secret && (
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted on the server. Leave the masked value
                    unchanged to keep the existing secret, or clear it to remove.
                  </p>
                )}
                {meta.description && (
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
