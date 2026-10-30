import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type React from 'react';
import { cn } from '../lib/cn';
import { useReturnFocus } from '../lib/useReturnFocus';
import { useLayerScope } from '../theme/EditorUIProvider';
import { IconButton } from './IconButton';

/**
 * Dialog on Radix (B15 E2b): focus is trapped and returns to the trigger,
 * Escape and the backdrop close it, page scroll is locked, and it fades and
 * zooms in and out. Same props as before.
 */
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  const layer = useLayerScope();
  const returnFocus = useReturnFocus(open);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={next => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ne-ui ne-motion-overlay fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs" />
        <DialogPrimitive.Content
          {...layer}
          onCloseAutoFocus={returnFocus}
          // Focus the dialog itself, not its close button (whose tooltip would pop).
          onOpenAutoFocus={event => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          // Without a description, tell Radix there is none on purpose.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            layer.className,
            'ne-motion-dialog fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-[var(--ne-radius-lg)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-5 text-[var(--ne-text)] shadow-2xl focus:outline-none',
            WIDTH[maxWidth]
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? (
                <DialogPrimitive.Title className="text-sm font-semibold text-[var(--ne-text)]">
                  {title}
                </DialogPrimitive.Title>
              ) : (
                <DialogPrimitive.Title className="sr-only">
                  Dialog
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs text-[var(--ne-text-muted)]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton size="sm" aria-label="Close" tooltip="Close (Esc)">
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <div className="text-xs leading-relaxed text-[var(--ne-text)]">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-[var(--ne-border)] pt-2">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
