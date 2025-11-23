// import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps } from '../types';
import type { InputProps } from '../../forms';
import { Input } from '../../forms';

interface TextFilterProps extends BaseFilterProps, Omit<InputProps, keyof BaseFilterProps> {}

export function TextFilter({
  value,
  size,
  label,
  showLabel,
  prefix,
  className,
  placeholder = '',
  handlers,
  config,
}: TextFilterProps) {
  const { size: _size, prefix: _prefix, ...restConfig } = config;

  return (
    <Input
      type="text"
      {...(showLabel && { label })}
      className={cn('min-w-48', className)}
      inputClassName="rounded-md"
      onChange={handlers.setTextValue}
      placeholder={placeholder}
      value={value}
      {...restConfig}
    />
  );
}
