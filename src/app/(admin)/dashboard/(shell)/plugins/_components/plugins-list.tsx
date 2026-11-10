'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ExternalLink, Plug, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PAGES } from '@/config/pages';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import type { DashboardPluginItem, PluginStatus } from '@/server/plugins/plugins.service';
import {
  clearPluginErrorAction,
  togglePluginAction,
} from '../_modules/plugins.actions';

function StatusBadge({ status }: { status: PluginStatus }) {
  if (status === 'enabled') {
    return (
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        Enabled
      </Badge>
    );
  }
  if (status === 'disabled') {
    return <Badge variant="secondary">Disabled</Badge>;
  }
  if (status === 'available') {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      >
        Available
      </Badge>
    );
  }
  return <Badge variant="destructive">Missing code</Badge>;
}

export function PluginsList({
  plugins,
}: {
  plugins: DashboardPluginItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onToggle = (plugin: DashboardPluginItem, nextEnabled: boolean) => {
    setPendingId(plugin.id);
    startTransition(async () => {
      await handleActionResponse(
        togglePluginAction({ pluginId: plugin.id, enabled: nextEnabled }),
        () => {
          toast.success(
            `${plugin.name} ${nextEnabled ? 'enabled' : 'disabled'}.`
          );
          router.refresh();
        }
      );
      setPendingId(null);
    });
  };

  const onClearError = (pluginId: string) => {
    setPendingId(pluginId);
    startTransition(async () => {
      await handleActionResponse(clearPluginErrorAction({ pluginId }), () => {
        toast.success('Error cleared.');
        router.refresh();
      });
      setPendingId(null);
    });
  };

  if (plugins.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No plugins are configured in <code>nextcms.plugins.ts</code>. Add a
          plugin path or run <code>pnpm plugin:new &lt;id&gt;</code>, then
          rebuild.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Code plugins are registered at build time in{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          nextcms.plugins.ts
        </code>
        . Toggle plugins on or off per site and configure their settings below.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Plugin</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plugins.map(plugin => {
              const isMissingCode = plugin.status === 'missing_code';
              const isPending = pendingId === plugin.id;
              return (
                <tr key={plugin.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-2.5">
                      <Plug className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {plugin.name}
                          </span>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {plugin.id}
                          </code>
                        </div>
                        {plugin.description && (
                          <p className="max-w-xl text-xs text-muted-foreground">
                            {plugin.description}
                          </p>
                        )}
                        {plugin.lastError && (
                          <div
                            role="alert"
                            className="mt-2 flex items-start justify-between gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
                          >
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                              <div>
                                <span className="font-medium">Last error:</span>{' '}
                                {plugin.lastError}
                                {plugin.lastErrorAt && (
                                  <span className="ml-1.5 opacity-75">
                                    (
                                    {formatDistanceToNow(
                                      new Date(plugin.lastErrorAt),
                                      { addSuffix: true }
                                    )}
                                    )
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onClearError(plugin.id)}
                              disabled={isPending}
                              title="Clear error"
                              className="rounded p-0.5 hover:bg-rose-200/50 dark:hover:bg-rose-900/50"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                    {plugin.version ?? '—'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={plugin.status} />
                  </td>
                  <td className="px-4 py-4">
                    <Switch
                      aria-label={`Toggle ${plugin.name}`}
                      checked={plugin.enabled}
                      disabled={isMissingCode || isPending}
                      onChange={checked => onToggle(plugin, checked)}
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!isMissingCode && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={PAGES.DASHBOARD.PLUGIN_SETTINGS(plugin.id)}>
                            <Settings className="mr-1.5 size-3.5" />
                            Settings
                          </Link>
                        </Button>
                      )}
                      {plugin.enabled &&
                        plugin.adminPages.map(page => (
                          <Button
                            key={page.slug}
                            asChild
                            size="sm"
                            variant="ghost"
                          >
                            <Link
                              href={PAGES.DASHBOARD.PLUGIN_PAGE(
                                plugin.id,
                                page.slug
                              )}
                            >
                              {page.title}
                              <ExternalLink className="ml-1.5 size-3" />
                            </Link>
                          </Button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
