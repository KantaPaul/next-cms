'use client';

import type { PluginAdminPageProps } from '@nextcms/plugin-sdk/client';
import { CheckCircle2, Loader2, Plug, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function MailchimpConnectionPage({ settings }: PluginAdminPageProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    lists?: Array<{ id: string; name: string }>;
  } | null>(null);

  const hasKey = Boolean(settings.apiKey);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch('/api/plugins/mailchimp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({
          ok: true,
          message: data.message,
          lists: data.lists,
        });
      } else {
        setResult({
          ok: false,
          message: data.error || 'Connection test failed.',
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <CardTitle>Mailchimp Connection Test</CardTitle>
        </div>
        <CardDescription>
          Verify the API key stored in Mailchimp plugin settings and inspect
          available audiences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {hasKey
            ? 'An encrypted API key is configured for this site.'
            : 'No API key is saved yet. Add one under Plugin Settings first.'}
        </p>

        <Button type="button" onClick={runTest} disabled={testing || !hasKey}>
          {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Test Connection
        </Button>

        {result && (
          <div
            className={`flex items-start gap-2 rounded-md p-3 text-sm ${
              result.ok
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="space-y-1">
              <div>{result.message}</div>
              {result.lists && result.lists.length > 0 && (
                <ul className="list-disc pl-4 text-xs">
                  {result.lists.map(list => (
                    <li key={list.id}>
                      {list.name} ({list.id})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
