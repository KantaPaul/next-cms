'use client';

import { type FormEvent, useId, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { type SectionSettings, Section } from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type NewsletterProps = WithSection & {
  title?: string;
  subtitle?: string;
  text?: string;
  placeholder?: string;
  submitText?: string;
  successMessage?: string;
  /** "centered" band, or "compact" left-aligned (footers, sidebars). */
  layout?: 'centered' | 'compact';
};

const DEFAULT_SUCCESS = 'Thanks! You are on the list.';

export function Newsletter(p: NewsletterProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const inputId = useId();
  const compact = p.layout === 'compact';

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
        <div
          role="status"
          className={cn(
            's-soft-primary s-radius p-6 font-medium',
            !compact && 'text-center'
          )}
        >
          {p.successMessage || DEFAULT_SUCCESS}
        </div>
      </Section>
    );
  }

  return (
    <Section section={p.section} editing={p.editing}>
      <div className={compact ? 'max-w-md' : 'mx-auto max-w-2xl text-center'}>
        {p.title ? (
          compact ? (
            <h3 className="text-lg font-semibold">{p.title}</h3>
          ) : (
            <h2 className="s-section-title">{p.title}</h2>
          )
        ) : null}
        {p.text ? (
          <p className={cn('s-muted', compact ? 'mt-2 text-sm' : 'mt-4 text-lg')}>
            {p.text}
          </p>
        ) : null}
        {p.subtitle ? (
          <p className={cn('s-muted', compact ? 'mt-1 text-sm' : 'mt-2')}>
            {p.subtitle}
          </p>
        ) : null}
        <form
          onSubmit={onSubmit}
          name="newsletter"
          className={cn(
            'relative mt-6 flex max-w-md gap-2',
            compact ? 'mt-4' : 'mx-auto'
          )}
        >
          <label htmlFor={inputId} className="sr-only">
            Email
          </label>
          <input
            id={inputId}
            name="email"
            type="email"
            required
            placeholder={p.placeholder || 'you@example.com'}
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
