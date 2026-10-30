import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** Id for the switch, so an outside <label htmlFor> can name it. */
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  'aria-label': ariaLabel,
  className = '',
}) => {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ne-focus-ring)] disabled:cursor-not-allowed ${
          checked ? 'bg-[var(--ne-primary)]' : 'bg-[var(--ne-border-strong)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5 ${
            checked
              ? 'translate-x-3.5 rtl:-translate-x-3.5'
              : 'translate-x-0.5 rtl:-translate-x-0.5'
          }`}
        />
      </button>
      {label && (
        <span className="text-xs text-[var(--ne-text)] font-sans">{label}</span>
      )}
    </label>
  );
};
