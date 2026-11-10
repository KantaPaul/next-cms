'use client';

import { type FormEvent, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { el, type ElementStyle } from './element';

export function PrivacyRequestClient({
  allowExport = true,
  allowErase = true,
  submitText = 'Send confirmation link',
  successMessage = 'If that email address is valid, we sent a confirmation link (valid for 24 hours).',
  editing,
  elements,
}: {
  allowExport?: boolean;
  allowErase?: boolean;
  submitText?: string;
  successMessage?: string;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const defaultType: 'export' | 'erase' = allowExport ? 'export' : 'erase';
  const [type, setType] = useState<'export' | 'erase'>(defaultType);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const styled = { elements };
  const btnEl = el(
    styled,
    'button',
    's-btn-primary s-radius px-5 py-2.5 text-sm font-medium transition disabled:opacity-50'
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editing) return;
    setStatus('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/privacy/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit privacy request.');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  if (!allowExport && !allowErase) {
    return editing ? (
      <div className="s-surface s-border s-muted s-radius border border-dashed p-6 text-center text-sm">
        Enable export or erasure in the sidebar.
      </div>
    ) : null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="s-surface s-border s-radius space-y-4 border p-6"
    >
      {status === 'sent' ? (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          {successMessage}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Request type</span>
            <div className="flex flex-wrap gap-3">
              {allowExport && (
                <label
                  className={cn(
                    's-border s-radius flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-sm',
                    type === 'export' &&
                      'border-[var(--site-primary)] font-medium'
                  )}
                >
                  <input
                    type="radio"
                    name="privacy_request_type"
                    value="export"
                    checked={type === 'export'}
                    onChange={() => setType('export')}
                    className="accent-[var(--site-primary)]"
                  />
                  Export my data
                </label>
              )}
              {allowErase && (
                <label
                  className={cn(
                    's-border s-radius flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-sm',
                    type === 'erase' &&
                      'border-[var(--site-primary)] font-medium'
                  )}
                >
                  <input
                    type="radio"
                    name="privacy_request_type"
                    value="erase"
                    checked={type === 'erase'}
                    onChange={() => setType('erase')}
                    className="accent-[var(--site-primary)]"
                  />
                  Erase my data
                </label>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="privacy-request-email"
              className="block text-sm font-medium"
            >
              Email address
            </label>
            <input
              id="privacy-request-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="s-border s-radius w-full border bg-[var(--site-bg)] px-3 py-2 text-sm text-[var(--site-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
            />
          </div>

          {status === 'error' && errorMsg && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending' || Boolean(editing)}
            className={btnEl.className}
            style={btnEl.style}
          >
            {status === 'sending' ? 'Sending…' : submitText}
          </button>
        </>
      )}
    </form>
  );
}
