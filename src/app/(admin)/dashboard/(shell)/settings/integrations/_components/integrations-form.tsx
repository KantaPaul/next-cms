'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Plug, Save, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  testMailchimpConnection,
  updateIntegrations,
} from '../../_modules/settings.actions';
import type { SiteIntegrations } from '@/db/schema';

function maskApiKey(key?: string): string {
  if (!key) return '';
  const parts = key.split('-');
  const dc = parts[1] ? `-${parts[1]}` : '';
  return `••••••••••••••••${dc}`;
}

export function IntegrationsForm({
  initialValues,
}: {
  initialValues?: SiteIntegrations;
}) {
  const router = useRouter();
  const existingKey = initialValues?.mailchimp?.apiKey ?? '';
  const [apiKey, setApiKey] = useState(maskApiKey(existingKey));
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);

    try {
      await updateIntegrations({
        mailchimp: {
          apiKey: apiKey.trim(),
        },
      });
      toast.success('Integrations updated successfully.');
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update integrations.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = (await testMailchimpConnection({ apiKey })) as any;
      if (res?.data?.ok) {
        setTestResult({ ok: true, message: res.data.message });
        toast.success(res.data.message);
      } else if (res?.ok) {
        setTestResult({ ok: true, message: res.message });
        toast.success(res.message);
      } else {
        const err =
          res?.data?.error ||
          res?.error ||
          res?.serverError ||
          'Connection test failed.';
        setTestResult({ ok: false, message: err });
        toast.error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection test failed.';
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <CardTitle>Mailchimp</CardTitle>
          </div>
          <CardDescription>
            Connect your Mailchimp account to automatically subscribe users who
            submit contact and lead forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mailchimp-api-key">API Key</Label>
            <Input
              id="mailchimp-api-key"
              type="text"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setApiKey(e.target.value)
              }
              placeholder="e.g. 1234567890abcdef-us21"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Create an API key in your Mailchimp account under Account &gt;
              Extras &gt; API keys. Make sure it includes the datacenter suffix
              (e.g.{' '}
              <code className="rounded bg-muted px-1 py-0.5">-us21</code>).
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                testResult.ok
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting || !apiKey}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test connection
          </Button>
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save integrations
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
