'use client';

import { type FormEvent, useId, useState } from 'react';
import { cmsApi, cmsSiteHeaders } from '@/lib/cms-api';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

export type NewsletterProps = WithSection & {
  title?: string;
  subtitle?: string;
  text?: string;
  placeholder?: string;
  submitText?: string;
  successMessage?: string;
  /** "centered" band, or "compact" left-aligned (footers, sidebars). */
  layout?: 'centered' | 'compact';
  /** Where the submit button sits relative to the email field. */
  buttonPosition?: 'right' | 'left' | 'top' | 'bottom';
  /** "auto" fits the label; "full" fills the row (stacked) or shares it with the field (side by side). */
  buttonWidth?: 'auto' | 'full';
};

/** Flex direction per button position; DOM order stays input → button. */
const BUTTON_POSITION_CLASS = {
  right: 'flex-row',
  left: 'flex-row-reverse',
  top: 'flex-col-reverse',
  bottom: 'flex-col',
} as const;

const DEFAULT_SUCCESS = 'Thanks! You are on the list.';

export function Newsletter(p: NewsletterProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const inputId = useId();
  const compact = p.layout === 'compact';
  const position = p.buttonPosition ?? 'right';
  const stacked = position === 'top' || position === 'bottom';
  const fullButton = (p.buttonWidth ?? (stacked ? 'full' : 'auto')) === 'full';

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
      const response = await fetch(cmsApi('/api/forms/submit'), {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json', ...cmsSiteHeaders() },
      });
      setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    const success = el(
      p,
      'success',
      cn('s-soft-primary s-radius p-6 font-medium', !compact && 'text-center')
    );
    return (
      <Section section={p.section} editing={p.editing}>
        <div role="status" {...success}>
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
            <h3 {...el(p, 'title', 'text-lg font-semibold')}>{p.title}</h3>
          ) : (
            <h2 {...el(p, 'title', 's-section-title')}>{p.title}</h2>
          )
        ) : null}
        {p.text ? (
          <p
            {...el(p, 'description', cn('s-muted', compact ? 'mt-2 text-sm' : 'mt-4 text-lg'))}
          >
            {p.text}
          </p>
        ) : null}
        {p.subtitle ? (
          <p {...el(p, 'subtitle', cn('s-muted', compact ? 'mt-1 text-sm' : 'mt-2'))}>
            {p.subtitle}
          </p>
        ) : null}
        <form
          onSubmit={onSubmit}
          name="newsletter"
          className={cn(
            'relative mt-6 flex max-w-md gap-2',
            BUTTON_POSITION_CLASS[position] ?? 'flex-row',
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
            {...el(p, 'input', cn('s-input h-11', stacked ? 'w-full' : 'min-w-0 flex-1'))}
          />
          {/* Honeypot: bots fill it in; real users never see or submit it. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -start-[9999px] h-px w-px overflow-hidden"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            {...el(
              p,
              'button',
              cn(
                's-btn s-btn-primary disabled:opacity-60',
                !fullButton && 'shrink-0',
                fullButton && (stacked ? 'w-full' : 'flex-1'),
                stacked && !fullButton && 'self-start'
              )
            )}
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
