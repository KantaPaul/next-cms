import type { InputProps } from '@/components/atoms/forms';
import { FormInput, Label } from '@/components/atoms/forms';
import { cn } from '@/lib/utils/cn';

export const Input = ({
  id,
  labelClassName,
  label,
  inputClassName,
  isRequired,
  className,
  ...props
}: InputProps & {
  labelClassName?: string;
  inputClassName?: string;
  className?: string;
  label?: string;
  isRequired?: boolean;
}) => {
  return (
    <div className={cn('grid w-full max-w-sm items-center gap-3', className)}>
      {label ? (
        <Label htmlFor={id} className={cn(labelClassName)}>
          {label}
          {isRequired && (
            <span className="dark:text-red-dark text-red-500">*</span>
          )}
        </Label>
      ) : (
        ''
      )}
      <FormInput {...props} className={cn(inputClassName)} />
    </div>
  );
};
