'use client';

import { type FormEvent, useEffect, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { ContactFormField } from './content';

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
}: {
  fields: ContactFormField[];
  submitText: string;
  successMessage: string;
  actionUrl?: string;
  formId?: string;
  editing?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const firstParty = !actionUrl;

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
      <p
        role="status"
        className="s-soft-primary s-radius p-6 text-center font-medium"
      >
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
              className="s-choice-row text-sm font-medium"
            >
              <input
                id={id}
                name={field.name}
                type="checkbox"
                value="yes"
                required={field.required}
                className="s-choice"
              />
              <span>
                {field.label}
                {field.required && <span className="s-accent-text"> *</span>}
              </span>
            </label>
          );
        }

        if (field.type === 'radio') {
          return (
            <fieldset key={id} className="grid gap-2">
              <legend className="text-sm font-medium">
                {field.label}
                {field.required && <span className="s-accent-text"> *</span>}
              </legend>
              {opts.length === 0 ? (
                <p className="s-muted text-xs">
                  Add options in the sidebar (one per line).
                </p>
              ) : (
                opts.map((opt, j) => {
                  const optId = `${id}-${j}`;
                  return (
                    <label
                      key={optId}
                      htmlFor={optId}
                      className="s-choice-row text-sm font-medium"
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
            <span>
              {field.label}
              {field.required && <span className="s-accent-text"> *</span>}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                id={id}
                name={field.name}
                required={field.required}
                rows={5}
                placeholder={field.placeholder}
                className="s-input"
              />
            ) : field.type === 'select' ? (
              <select
                id={id}
                name={field.name}
                required={field.required}
                className="s-input"
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
                className="s-input"
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
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
            />
          )}
        </>
      )}
      {editing && (
        <p className="s-muted text-xs">
          {firstParty
            ? 'Submissions are saved to the form inbox. Set a form action URL to send them somewhere else instead.'
            : 'This form posts to the action URL in the sidebar.'}
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          Something went wrong. Please try again.
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'sending' || editing}
        className="s-btn s-btn-primary justify-self-start disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : submitText}
      </button>
    </form>
  );
}
