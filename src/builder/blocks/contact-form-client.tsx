'use client';

import { type FormEvent, useEffect, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils/cn';
import type { ContactFormField } from './content';
import { el, type ElementStyle } from './element';

const INPUT_TYPES = new Set(['text', 'email', 'tel', 'number', 'date', 'url']);

function parseOptions(options?: string): { value: string; label: string }[] {
  if (!options?.trim()) return [];
  return options
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map(line => {
      const pipe = line.indexOf('|');
      if (pipe === -1) return { value: line, label: line };
      const value = line.slice(0, pipe).trim();
      const label = line.slice(pipe + 1).trim() || value;
      return { value: value || label, label };
    });
}

function PhoneField({
  id,
  name,
  required,
  placeholder,
}: {
  id: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState<string | undefined>();

  return (
    <>
      <PhoneInput
        id={id}
        international
        defaultCountry="US"
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        numberInputProps={{
          required,
          className: 'PhoneInputInput',
        }}
        className="PhoneInput"
      />
      <input type="hidden" name={name} value={value ?? ''} />
    </>
  );
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactFormClient({
  fields,
  submitText,
  successMessage,
  actionUrl,
  formId,
  editing,
  elements,
}: {
  fields: ContactFormField[];
  submitText: string;
  successMessage: string;
  actionUrl?: string;
  formId?: string;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const firstParty = !actionUrl;

  const labelEl = el({ elements }, 'label');
  const reqEl = el({ elements }, 'required', 's-accent-text');
  const inputEl = el({ elements }, 'input', 's-input');
  const choiceEl = el(
    { elements },
    'choice',
    's-choice-row text-sm font-medium'
  );
  const helpEl = el({ elements }, 'help', 's-muted text-xs');
  const buttonEl = el(
    { elements },
    'button',
    's-btn s-btn-primary justify-self-start disabled:opacity-60'
  );
  const successEl = el(
    { elements },
    'success',
    's-soft-primary s-radius p-6 text-center font-medium'
  );
  const errorEl = el({ elements }, 'error', 'text-sm text-red-600');

  useEffect(() => {
    if (!firstParty || !TURNSTILE_SITE_KEY || editing) return;
    if (document.querySelector('script[data-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.dataset.turnstile = 'true';
    document.body.appendChild(script);
  }, [editing, firstParty]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing) return;
    setState('sending');
    try {
      const response = await fetch(actionUrl || '/api/forms/submit', {
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
      <p role="status" className={successEl.className} style={successEl.style}>
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {fields.map((field, i) => {
        const id = `cf-${field.name || i}`;
        const opts = parseOptions(field.options);

        if (field.type === 'checkbox') {
          return (
            <label
              key={id}
              htmlFor={id}
              className={choiceEl.className}
              style={choiceEl.style}
            >
              <input
                id={id}
                name={field.name}
                type="checkbox"
                value="yes"
                required={field.required}
                className="s-choice"
              />
              <span className={labelEl.className} style={labelEl.style}>
                {field.label}
                {field.required && (
                  <span className={reqEl.className} style={reqEl.style}>
                    {' '}
                    *
                  </span>
                )}
              </span>
            </label>
          );
        }

        if (field.type === 'radio') {
          return (
            <fieldset key={id} className="grid gap-2">
              <legend
                className={
                  labelEl.className
                    ? cn('text-sm font-medium', labelEl.className)
                    : 'text-sm font-medium'
                }
                style={labelEl.style}
              >
                {field.label}
                {field.required && (
                  <span className={reqEl.className} style={reqEl.style}>
                    {' '}
                    *
                  </span>
                )}
              </legend>
              {opts.length === 0 ? (
                <p className={helpEl.className} style={helpEl.style}>
                  Add options in the sidebar (one per line).
                </p>
              ) : (
                opts.map((opt, j) => {
                  const optId = `${id}-${j}`;
                  return (
                    <label
                      key={optId}
                      htmlFor={optId}
                      className={choiceEl.className}
                      style={choiceEl.style}
                    >
                      <input
                        id={optId}
                        name={field.name}
                        type="radio"
                        value={opt.value}
                        required={field.required}
                        className="s-choice"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })
              )}
            </fieldset>
          );
        }

        return (
          <label
            key={id}
            htmlFor={id}
            className="grid gap-1.5 text-sm font-medium"
          >
            <span className={labelEl.className} style={labelEl.style}>
              {field.label}
              {field.required && (
                <span className={reqEl.className} style={reqEl.style}>
                  {' '}
                  *
                </span>
              )}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                id={id}
                name={field.name}
                required={field.required}
                rows={5}
                placeholder={field.placeholder}
                className={inputEl.className}
                style={inputEl.style}
              />
            ) : field.type === 'select' ? (
              <select
                id={id}
                name={field.name}
                required={field.required}
                className={inputEl.className}
                style={inputEl.style}
                defaultValue=""
              >
                <option value="" disabled={field.required}>
                  {field.placeholder || 'Select…'}
                </option>
                {opts.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'tel' ? (
              <PhoneField
                id={id}
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                id={id}
                name={field.name}
                type={INPUT_TYPES.has(field.type) ? field.type : 'text'}
                required={field.required}
                placeholder={field.placeholder}
                className={inputEl.className}
                style={inputEl.style}
              />
            )}
          </label>
        );
      })}
      {firstParty && (
        <>
          <input type="hidden" name="formId" value={formId ?? ''} />
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          />
          {TURNSTILE_SITE_KEY && (
            <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
          )}
        </>
      )}
      {editing && (
        <p className={helpEl.className} style={helpEl.style}>
          {firstParty
            ? 'Submissions are saved to the form inbox. Set a form action URL to send them somewhere else instead.'
            : 'This form posts to the action URL in the sidebar.'}
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className={errorEl.className} style={errorEl.style}>
          Something went wrong. Please try again.
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'sending' || editing}
        className={buttonEl.className}
        style={buttonEl.style}
      >
        {state === 'sending' ? 'Sending…' : submitText}
      </button>
    </form>
  );
}
