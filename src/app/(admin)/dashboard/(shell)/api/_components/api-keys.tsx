'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Check, Copy, KeyRound, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
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
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { cn } from '@/lib/utils/cn';
import type { ApiKeyListItem } from '@/server/services/api-keys.service';
import { createApiKey, revokeApiKey } from '../_modules/api-keys.actions';

const ENDPOINTS = [
  {
    path: '/pages',
    description:
      'Published pages. Supports ?lang=, ?page= and ?limit= (max 100).',
  },
  {
    path: '/pages/{slug}',
    description:
      'One published page with content, SEO and translations. Supports ?lang=.',
  },
  {
    path: '/posts',
    description:
      'Published posts. Supports ?lang=, ?q=, ?category=, ?tag=, ?sort=newest|oldest|title, ?page= and ?limit=.',
  },
  {
    path: '/posts/{slug}',
    description:
      'One published post with sanitized body, resolved layout and SEO. Supports ?lang=.',
  },
  {
    path: '/menus',
    description:
      'Menus with nested items. Supports ?location=header|footer|sidebar.',
  },
  { path: '/settings', description: 'Public site settings and theme tokens.' },
  {
    path: '/media',
    description:
      'Media library. Supports ?q=, ?type=image|video|document, ?folder=.',
  },
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={label}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (next) return onOpenChange(true);
    onOpenChange(false);
    setName('');
    setCreatedKey(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    try {
      await handleActionResponse(createApiKey({ name }), created => {
        setCreatedKey(created.key);
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your new API key</DialogTitle>
              <DialogDescription>
                This is the only time the full key is shown. Store it somewhere
                safe, such as an environment variable.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md bg-steel-100 px-3 py-2 font-mono text-xs dark:bg-dark-200">
                {createdKey}
              </code>
              <CopyButton value={createdKey} label="Copy API key" />
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => close(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Keys give read-only access to published content through the v1
                API.
              </DialogDescription>
            </DialogHeader>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Name
              <FormInput
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Marketing site"
                maxLength={100}
                autoFocus
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KeysTable({ keys }: { keys: ApiKeyListItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const revoke = async (key: ApiKeyListItem) => {
    if (
      !window.confirm(
        `Revoke "${key.name}"? Apps using this key will stop working immediately.`
      )
    )
      return;
    setPendingId(key.id);

    try {
      await handleActionResponse(revokeApiKey({ id: key.id }), () => {
        toast.success(`Revoked "${key.name}"`);
        router.refresh();
      });
    } finally {
      setPendingId(null);
    }
  };

  if (!keys.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-steel-300 px-6 py-12 text-center dark:border-dark-300">
        <KeyRound className="size-8 text-steel-400" />
        <p className="font-medium">No API keys yet</p>
        <p className="max-w-sm text-sm text-steel-500">
          Create a key to read pages, posts, menus, settings and media from
          another app.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-steel-200 dark:border-dark-300">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500 dark:bg-dark-100">
          <tr>
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Key</th>
            <th className="px-4 py-2.5 font-medium">Created</th>
            <th className="px-4 py-2.5 font-medium">Last used</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-200 dark:divide-dark-300">
          {keys.map(key => {
            const revoked = !!key.revokedAt;
            return (
              <tr key={key.id} className={cn(revoked && 'text-steel-400')}>
                <td className="px-4 py-3 font-medium">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                <td className="px-4 py-3">
                  <div>{format(new Date(key.createdAt), 'MMM d, yyyy')}</div>
                  {key.createdByName && (
                    <div className="text-xs text-steel-500">
                      by {key.createdByName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {key.lastUsedAt
                    ? formatDistanceToNow(new Date(key.lastUsedAt), {
                        addSuffix: true,
                      })
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      revoked
                        ? 'bg-steel-100 text-steel-500 dark:bg-dark-200'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    )}
                  >
                    {revoked ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {!revoked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pendingId === key.id}
                      onClick={() => revoke(key)}
                      aria-label={`Revoke ${key.name}`}
                    >
                      {pendingId === key.id && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ApiKeys({
  keys,
  baseUrl,
}: {
  keys: ApiKeyListItem[];
  baseUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const example = `curl ${baseUrl}/pages \\\n  -H "Authorization: Bearer <your-key>"`;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-steel-500">
            Read-only access to published content. Each key is limited to 60
            requests per minute.
          </p>
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New API key
          </Button>
        </div>
        <KeysTable keys={keys} />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-steel-200 p-4 dark:border-dark-300">
        <h2 className="font-semibold">Quick start</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-steel-500">Base URL</span>
          <code className="rounded bg-steel-100 px-2 py-1 font-mono text-xs dark:bg-dark-200">
            {baseUrl}
          </code>
          <CopyButton value={baseUrl} label="Copy base URL" />
        </div>
        <pre className="overflow-x-auto rounded-md bg-dark-100 p-3 font-mono text-xs text-steel-100">
          {example}
        </pre>
        <ul className="flex flex-col divide-y divide-steel-200 text-sm dark:divide-dark-300">
          {ENDPOINTS.map(endpoint => (
            <li
              key={endpoint.path}
              className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4"
            >
              <code className="shrink-0 font-mono text-xs sm:w-40">
                GET {endpoint.path}
              </code>
              <span className="text-steel-500">{endpoint.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <CreateKeyDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
