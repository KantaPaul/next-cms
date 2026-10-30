import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton.tsx';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${widthClass} bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-lg)] shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-[var(--ne-text)] font-sans">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-[var(--ne-text-muted)] mt-1 font-sans">
                {description}
              </p>
            )}
          </div>
          <IconButton size="sm" onClick={onClose} tooltip="Close (Esc)">
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>

        <div className="text-xs text-[var(--ne-text)] font-sans leading-relaxed">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ne-border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
