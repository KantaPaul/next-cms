import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { toast as sonnerToast, Toaster } from 'sonner';

/**
 * Editor toasts on sonner (B15 E2b): stacked, animated in and out, swipe or
 * click to dismiss, announced politely. They go to the editor's own Toaster
 * (`toasterId`), so the host app's sonner toasts never show twice. Same API
 * as before: `const { toast, dismiss } = useToast()`.
 */
export interface ToastMessage {
  id: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (msg: Omit<ToastMessage, 'id'>) => string;
  dismiss: (id: string) => void;
}

const TOASTER_ID = 'ne-editor';

// Built on demand, not at import time, so loading this module renders nothing.
function iconFor(type: NonNullable<ToastMessage['type']>) {
  switch (type) {
    case 'success':
      return (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ne-success)]" />
      );
    case 'warning':
      return (
        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--ne-warning)]" />
      );
    case 'error':
      return (
        <AlertCircle className="h-4 w-4 shrink-0 text-[var(--ne-danger)]" />
      );
    default:
      return <Info className="h-4 w-4 shrink-0 text-[var(--ne-primary)]" />;
  }
}

function ToastCard({ id, type = 'info', title, message }: ToastMessage) {
  return (
    <div className="ne-ui flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-3 text-[var(--ne-text)] shadow-lg">
      <div className="mt-0.5">{iconFor(type)}</div>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-xs font-semibold text-[var(--ne-text)]">{title}</p>
        )}
        <p className="text-xs text-[var(--ne-text-muted)]">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => sonnerToast.dismiss(id)}
        className="cursor-pointer rounded p-0.5 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function show(msg: Omit<ToastMessage, 'id'>): string {
  const id = sonnerToast.custom(
    toastId => <ToastCard {...msg} id={String(toastId)} />,
    {
      toasterId: TOASTER_ID,
      duration:
        msg.duration && msg.duration > 0
          ? msg.duration
          : msg.duration === 0
            ? Number.POSITIVE_INFINITY
            : 4000,
    }
  );
  return String(id);
}

const api: ToastContextType = {
  toast: show,
  dismiss: id => sonnerToast.dismiss(id),
};

const ToastContext = createContext<ToastContextType | null>(null);

/** Renders the editor's Toaster once; nested providers reuse the outer one. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const outer = useContext(ToastContext);
  const value = useMemo(() => api, []);
  if (outer) return <>{children}</>;
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        id={TOASTER_ID}
        position="bottom-right"
        gap={8}
        visibleToasts={4}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => useContext(ToastContext) ?? api;
