import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...msg, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = msg.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const icon = {
            success: <CheckCircle2 className="w-4 h-4 text-[var(--ne-success)] shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-[var(--ne-warning)] shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-[var(--ne-danger)] shrink-0" />,
            info: <Info className="w-4 h-4 text-[var(--ne-primary)] shrink-0" />,
          }[t.type || 'info'];

          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto flex items-start gap-2.5 p-3 bg-[var(--ne-surface)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] shadow-lg animate-in slide-in-from-bottom-2 duration-150"
            >
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-xs font-semibold text-[var(--ne-text)] font-sans">
                    {t.title}
                  </p>
                )}
                <p className="text-xs text-[var(--ne-text-muted)] font-sans">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (msg: Omit<ToastMessage, 'id'>) => console.log('Toast:', msg),
      dismiss: () => {},
    };
  }
  return context;
};
