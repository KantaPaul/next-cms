'use client';

import { type FormEvent, useState } from 'react';
import { type SectionSettings, Section } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type NewsletterProps = WithSection & {
  title?: string;
  subtitle?: string;
  text?: string;
  /** Subscriber email. */
  email?: string;
  submitText?: string;
  successMessage?: string;
};

const DEFAULT_SUCCESS = 'Thanks! You are on the list.';

export function Newsletter(p: NewsletterProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (p.editing) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    if (!email) {
      setState('error');
      return;
    }
    setState('sending');
    try {
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <Section section={p.section} editing={p.editing}>
        <div className="s-soft-primary s-radius p-6 text-center font-medium">
          {p.successMessage || DEFAULT_SUCCESS}
        </div>
      </Section>
    );
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <div className="mx-auto max-w-2xl text-center">
        {p.title ? (
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{p.title}</h2>
        ) : null}
        {p.text ? <p className="s-muted mt-4 text-lg">{p.text}</p> : null}
        {p.subtitle ? <p className="s-muted mt-2">{p.subtitle}</p> : null}
        <form
          onSubmit={onSubmit}
          name="newsletter"
          className="relative mx-auto mt-6 flex max-w-md gap-2"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            defaultValue={p.email}
            placeholder="you@example.com"
            className="s-input h-11 w-full"
          />
          {/* Honeypot: bots fill it in; real users never see or submit it. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className="s-btn s-btn-primary disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : p.submitText || 'Subscribe'}
          </button>
        </form>
        {state === 'error' ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        ) : null}
      </div>
    </Section>
  );
}
