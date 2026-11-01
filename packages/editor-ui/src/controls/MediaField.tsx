import { AlertTriangle, FolderOpen, ImageIcon, Trash2 } from 'lucide-react';
import React from 'react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { type ControlDeviceState, ControlRow } from './ControlRow';

/** What a media field stores: the file's URL and its alt text. */
export interface MediaValue {
  url: string;
  alt?: string;
}

/** A file the host's media library hands back. */
export interface MediaSelection {
  url: string;
  alt?: string;
}

/**
 * Opens the host's media library. Call `pick` once the user chooses a file;
 * never calling it means they cancelled.
 */
export type MediaBrowseHandler = (pick: (media: MediaSelection) => void) => void;

/** Accepts a bare URL string (older image fields) or a MediaValue. */
export function normalizeMedia(value: unknown): MediaValue {
  if (typeof value === 'string') return { url: value };
  if (value && typeof value === 'object' && 'url' in value) {
    const v = value as { url?: unknown; alt?: unknown };
    return {
      url: typeof v.url === 'string' ? v.url : '',
      alt: typeof v.alt === 'string' ? v.alt : undefined,
    };
  }
  return { url: '' };
}

export interface MediaFieldProps {
  id?: string;
  label?: string;
  value: MediaValue;
  onChange: (value: MediaValue) => void;
  /** Shows the alt-text input and its a11y warning (default true). */
  showAlt?: boolean;
  /** Opens the host's media library; without it there is no Browse button. */
  onBrowse?: MediaBrowseHandler;
  placeholder?: string;
  info?: string;
  changed?: boolean;
  onReset?: () => void;
  deviceState?: ControlDeviceState;
  disabled?: boolean;
  className?: string;
}

export const MediaField: React.FC<MediaFieldProps> = ({
  id,
  label,
  value,
  onChange,
  showAlt = true,
  onBrowse,
  placeholder = 'https://example.com/image.jpg',
  info,
  changed,
  onReset,
  deviceState,
  disabled = false,
  className,
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const altId = `${fieldId}-alt`;
  const url = value.url ?? '';
  const alt = value.alt ?? '';
  const missingAlt = showAlt && !!url && !alt.trim();

  const browse = () =>
    onBrowse?.(media =>
      onChange({ url: media.url, alt: media.alt || value.alt })
    );

  const body = (
    <div
      className={cn(
        'space-y-2 rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-2',
        !label && className
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          disabled={disabled || !onBrowse}
          onClick={browse}
          aria-label={onBrowse ? 'Browse media library' : undefined}
          tabIndex={onBrowse ? 0 : -1}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] enabled:cursor-pointer enabled:hover:border-[var(--ne-primary)] disabled:cursor-default"
        >
          {url ? (
            // biome-ignore lint/performance/noImgElement: framework-agnostic package
            <img
              src={url}
              alt={alt || 'Selected media preview'}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon aria-hidden className="h-5 w-5 text-[var(--ne-text-muted)]" />
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            id={fieldId}
            type="url"
            value={url}
            disabled={disabled}
            placeholder={placeholder}
            onChange={e => onChange({ ...value, url: e.target.value })}
            className="h-7 w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] px-2 font-mono text-[11px] text-[var(--ne-text)] outline-none focus:border-[var(--ne-primary)]"
          />
          <div className="flex items-center gap-2 text-[10px]">
            {onBrowse && (
              <button
                type="button"
                disabled={disabled}
                onClick={browse}
                className="inline-flex items-center gap-1 font-medium text-[var(--ne-primary)] hover:underline"
              >
                <FolderOpen aria-hidden className="h-3 w-3" />
                Browse
              </button>
            )}
            {!onBrowse && (
              <span className="text-[var(--ne-text-muted)]">
                Paste an image URL
              </span>
            )}
            {url && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ url: '', alt: value.alt })}
                className="ms-auto inline-flex items-center gap-1 text-[var(--ne-danger)] hover:underline"
              >
                <Trash2 aria-hidden className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {showAlt && (
        <div className="space-y-1 border-t border-[var(--ne-border)] pt-2">
          <label
            htmlFor={altId}
            className="text-[10px] font-semibold text-[var(--ne-text)]"
          >
            Alt text
          </label>
          <input
            id={altId}
            type="text"
            value={alt}
            disabled={disabled}
            aria-invalid={missingAlt || undefined}
            aria-describedby={missingAlt ? `${altId}-warning` : undefined}
            placeholder="Describe the image for screen readers"
            onChange={e => onChange({ ...value, alt: e.target.value })}
            className={cn(
              'h-7 w-full rounded-[var(--ne-radius-md)] border bg-[var(--ne-surface)] px-2 text-xs text-[var(--ne-text)] outline-none focus:border-[var(--ne-primary)]',
              missingAlt
                ? 'border-[var(--ne-warning)]'
                : 'border-[var(--ne-border)]'
            )}
          />
          {missingAlt && (
            <p
              id={`${altId}-warning`}
              role="status"
              className="flex items-center gap-1 text-[10px] font-medium text-[var(--ne-warning)]"
            >
              <AlertTriangle aria-hidden className="h-3 w-3 shrink-0" />
              Missing alt text: screen readers can't describe this image.
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (!label) return body;

  return (
    <ControlRow
      label={label}
      htmlFor={fieldId}
      labelPosition="above"
      info={info}
      changed={changed}
      onReset={onReset}
      deviceState={deviceState}
      className={className}
    >
      {body}
    </ControlRow>
  );
};
