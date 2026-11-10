'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils/cn';
import type { ContactFormField } from './content';
import { el, type ElementStyle } from './element';
import { isFieldVisible, splitSteps } from '../forms/logic';

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
  onChange,
}: {
  id: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  onChange?: (val: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>();

  const handleChange = (val?: string) => {
    setValue(val);
    onChange?.(val ?? '');
  };

  return (
    <>
      <PhoneInput
        id={id}
        international
        defaultCountry="US"
        value={value}
        onChange={handleChange}
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

function getAcceptAttribute(
  accept?: 'images' | 'documents' | 'both'
): string | undefined {
  if (accept === 'images') {
    return 'image/*';
  }
  if (accept === 'documents') {
    return '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
  }
  if (accept === 'both') {
    return 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';
  }
  return undefined;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactFormClient({
  fields,
  submitText,
  successMessage,
  actionUrl,
  formId,
  nodeId,
  formSource,
  editing,
  elements,
}: {
  fields: ContactFormField[];
  submitText: string;
  successMessage: string;
  actionUrl?: string;
  formId?: string;
  nodeId?: string;
  formSource?: {
    kind: 'global' | 'page' | 'post';
    id: string;
    nodeId?: string;
  };
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const firstParty = !actionUrl;

  const steps = useMemo(() => splitSteps(fields), [fields]);
  const totalSteps = steps.length;
  const isMultiStep = totalSteps > 1;

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
  const prevButtonEl = el(
    { elements },
    'prevButton',
    's-btn s-btn-secondary justify-self-start disabled:opacity-60'
  );
  const stepEl = el({ elements }, 'step', 'text-base font-semibold s-heading');
  const progressEl = el(
    { elements },
    'progress',
    'text-xs font-medium s-muted uppercase tracking-wider'
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

  const onFormInput = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    if (target.name) {
      const val =
        target.type === 'checkbox'
          ? (target as HTMLInputElement).checked
            ? target.value || 'yes'
            : ''
          : target.value;
      setValues(prev => ({ ...prev, [target.name]: val }));
    }
  };

  const handleNext = () => {
    if (!formRef.current) return;
    const container = formRef.current.querySelector(
      `[data-step-index="${currentStepIndex}"]`
    );
    if (container) {
      const inputs = container.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea');
      for (const input of inputs) {
        if (!input.checkValidity()) {
          input.reportValidity();
          return;
        }
      }
    }
    setCurrentStepIndex(prev => Math.min(prev + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    setCurrentStepIndex(prev => Math.max(prev - 1, 0));
  };

  const onFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    maxMb?: number
  ) => {
    const max = maxMb ?? 10;
    const maxBytes = max * 1024 * 1024;
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      if (fileList[i].size > maxBytes) {
        setFileErrors(prev => ({
          ...prev,
          [e.target.name]: `File "${fileList[i].name}" exceeds ${max}MB limit.`,
        }));
        e.target.value = '';
        return;
      }
    }

    setFileErrors(prev => {
      const next = { ...prev };
      delete next[e.target.name];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing) return;
    setState('sending');
    setServerError(null);

    try {
      const response = await fetch(actionUrl || '/api/forms/submit', {
        method: 'POST',
        body: new FormData(event.currentTarget),
        headers: { Accept: 'application/json' },
      });

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        redirectTo?: string;
        error?: string;
      } | null;

      if (response.ok && data?.ok) {
        if (data.redirectTo) {
          window.location.href = data.redirectTo;
          return;
        }
        setState('sent');
      } else {
        setServerError(
          data?.error || 'Something went wrong. Please try again.'
        );
        setState('error');
      }
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

  const renderField = (field: ContactFormField, i: number) => {
    const visible = isFieldVisible(field, values);
    if (!visible && !editing) return null;

    const id = `cf-${field.name || i}`;
    const opts = parseOptions(field.options);

    if (field.type === 'step') {
      return null;
    }

    if (field.type === 'hidden') {
      let val = field.hiddenValue ?? '';
      if (
        field.hiddenSource === 'url_param' &&
        typeof window !== 'undefined'
      ) {
        const param = field.hiddenValue?.trim() || field.name;
        val = new URLSearchParams(window.location.search).get(param) ?? '';
      }
      return (
        <input
          key={id}
          type="hidden"
          name={field.name}
          value={val}
          id={id}
        />
      );
    }

    if (field.type === 'acceptance') {
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
            required
            className="s-choice"
          />
          <span className={labelEl.className} style={labelEl.style}>
            {field.label}
            <span className={reqEl.className} style={reqEl.style}>
              {' '}
              *
            </span>
          </span>
        </label>
      );
    }

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

    if (field.type === 'file') {
      const acceptAttr = getAcceptAttribute(field.accept);
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
          <input
            id={id}
            name={field.name}
            type="file"
            accept={acceptAttr}
            multiple={field.multiple}
            required={field.required}
            onChange={e => onFileChange(e, field.maxSizeMb)}
            className={inputEl.className}
            style={inputEl.style}
          />
          {fieldErrors(field.name)}
        </label>
      );
    }

    return (
      <label key={id} htmlFor={id} className="grid gap-1.5 text-sm font-medium">
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
            onChange={val =>
              setValues(prev => ({ ...prev, [field.name]: val }))
            }
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
  };

  const fieldErrors = (name: string) => {
    if (!fileErrors[name]) return null;
    return <span className="text-xs text-red-600">{fileErrors[name]}</span>;
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={onFormInput}
      className="grid gap-4"
    >
      {/* Progress / Step header for public multi-step */}
      {!editing && isMultiStep && (
        <div className="space-y-1.5 pb-2">
          <div className="flex items-center justify-between">
            <span className={stepEl.className} style={stepEl.style}>
              {steps[currentStepIndex]?.title}
            </span>
            <span className={progressEl.className} style={progressEl.style}>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full s-surface-alt">
            <div
              className="h-full s-primary-bg transition-all duration-300 motion-reduce:transition-none"
              style={{
                width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Editor view: stack all steps with visual divider */}
      {editing ? (
        <div className="grid gap-6">
          {steps.map((step, stepIdx) => (
            <div
              key={stepIdx}
              className="grid gap-4 rounded-md border border-dashed border-slate-300 p-4"
            >
              {isMultiStep && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className={stepEl.className} style={stepEl.style}>
                    {step.title}
                  </span>
                  <span
                    className={progressEl.className}
                    style={progressEl.style}
                  >
                    Step {stepIdx + 1} of {totalSteps}
                  </span>
                </div>
              )}
              {step.fields.map((f, i) => renderField(f, i))}
            </div>
          ))}
        </div>
      ) : (
        /* Public view: every step stays mounted and only the active one shows,
           so earlier answers and chosen files are still in the form on submit. */
        steps.map((step, stepIdx) => (
          <div
            key={stepIdx}
            data-step-container
            data-step-index={stepIdx}
            hidden={stepIdx !== currentStepIndex}
            className={cn('grid gap-4', stepIdx !== currentStepIndex && 'hidden')}
          >
            {step.fields.map((f, i) => renderField(f, i))}
          </div>
        ))
      )}

      {firstParty && (
        <>
          <input type="hidden" name="formId" value={formId ?? ''} />
          <input
            type="hidden"
            name="formSourceKind"
            value={formSource?.kind ?? (formId ? 'global' : '')}
          />
          <input
            type="hidden"
            name="formSourceId"
            value={formSource?.id ?? (formId ?? '')}
          />
          <input
            type="hidden"
            name="formNodeId"
            value={formSource?.nodeId ?? nodeId ?? ''}
          />
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
          {serverError || 'Something went wrong. Please try again.'}
        </p>
      )}

      {/* Button controls */}
      <div className="flex items-center gap-3 pt-2">
        {!editing && isMultiStep && currentStepIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={state === 'sending'}
            className={prevButtonEl.className}
            style={prevButtonEl.style}
          >
            Previous
          </button>
        )}

        {!editing && isMultiStep && currentStepIndex < totalSteps - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className={buttonEl.className}
            style={buttonEl.style}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={state === 'sending' || editing}
            className={buttonEl.className}
            style={buttonEl.style}
          >
            {state === 'sending' ? 'Sending…' : submitText}
          </button>
        )}
      </div>
    </form>
  );
}
