import { cn } from '@/lib/utils/cn';

export const inputClass =
  'h-9 w-full rounded-md border border-steel-200 bg-white px-3 text-sm shadow-xs outline-none transition focus:border-steel-400 focus:ring-2 focus:ring-steel-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-300 dark:bg-dark-100 dark:focus:ring-dark-300';

export const textareaClass = cn(inputClass, 'h-auto min-h-20 py-2');

export function FieldShell({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center justify-between text-sm font-medium text-steel-700 dark:text-steel-200">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-steel-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
