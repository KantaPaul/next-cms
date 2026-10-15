import type { InputProps } from '@/components/atoms/forms';
import { FieldError, FormInput, Label } from '@/components/atoms/forms';
import { cn } from '@/lib/utils/cn';

export const Input = ({
  id,
  labelClassName,
  label,
  inputClassName,
  isRequired,
  className,
  error,
  errorClassName,
  ...props
}: InputProps & {
  labelClassName?: string;
  inputClassName?: string;
  className?: string;
  label?: string;
  error?: string;
  errorClassName?: string;
  isRequired?: boolean;
}) => {
  return (
    <div className={cn('grid w-full items-center gap-3', className)}>
      {label ? (
        <Label htmlFor={id} className={cn(labelClassName)}>
          {label}
          {isRequired && (
            <span className="text-destructive">*</span>
          )}
        </Label>
      ) : (
        ''
      )}
      <FormInput {...props} className={cn(inputClassName)} />
      {error && (
        <FieldError error={error} className={cn('mt-2', errorClassName)} />
      )}
    </div>
  );
};
