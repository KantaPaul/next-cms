'use client';

import { useState, type FormEvent } from 'react';
import type { ContactFormField } from './content';

export function ContactFormClient({
  fields,
  submitText,
  successMessage,
  actionUrl,
  editing,
}: {
  fields: ContactFormField[];
  submitText: string;
  successMessage: string;
  actionUrl?: string;
  editing?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing || !actionUrl) return;
    setState('sending');
    try {
      const response = await fetch(actionUrl, {
        method: 'POST',
        body: new FormData(event.currentTarget),
        headers: { Accept: 'application/json' },
      });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <p role="status" className="s-soft-primary s-radius p-6 text-center font-medium">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {fields.map((field, i) => {
        const id = `cf-${field.name || i}`;
        return (
          <label key={id} htmlFor={id} className="grid gap-1.5 text-sm font-medium">
            <span>
              {field.label}
              {field.required && <span className="s-accent-text"> *</span>}
            </span>
            {field.type === 'textarea' ? (
              <textarea id={id} name={field.name} required={field.required} rows={5} className="s-input" />
            ) : (
              <input id={id} name={field.name} type={field.type} required={field.required} className="s-input" />
            )}
          </label>
        );
      })}
      {!actionUrl && editing && (
        <p className="s-muted text-xs">Set a form endpoint (e.g. Formspree) in the sidebar to receive submissions.</p>
      )}
      {state === 'error' && <p role="alert" className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      <button type="submit" disabled={state === 'sending' || (!actionUrl && !editing)} className="s-btn s-btn-primary justify-self-start disabled:opacity-60">
        {state === 'sending' ? 'Sending…' : submitText}
      </button>
    </form>
  );
}
