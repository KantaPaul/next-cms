import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to display content',
  message = 'We could not load this item. Please check your network connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center border border-[var(--ne-danger)]/30 bg-[var(--ne-danger-soft)]/20 rounded-[var(--ne-radius-md)] ${className}`}>
      <div className="w-8 h-8 rounded-full bg-[var(--ne-danger-soft)] text-[var(--ne-danger)] flex items-center justify-center mb-2.5">
        <AlertCircle className="w-4 h-4" />
      </div>
      <h4 className="text-xs font-semibold text-[var(--ne-text)] mb-1">
        {title}
      </h4>
      <p className="text-xs text-[var(--ne-text-muted)] max-w-sm mb-3">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
