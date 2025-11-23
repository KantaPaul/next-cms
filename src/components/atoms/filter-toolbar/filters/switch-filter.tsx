import { Switch, type SwitchProps } from '@/components/ui/switch';
import type { BaseFilterProps } from '../types';

interface SwitchFilterProps
  extends BaseFilterProps,
    Omit<SwitchProps, keyof BaseFilterProps | 'onChange' | 'checked'> {}

export function SwitchFilter({ value, label, isLoading, handlers, config }: SwitchFilterProps) {
  return (
    <Switch
      checked={value === 'yes'}
      isLoading={isLoading}
      label={label}
      onChange={() => {
        if (value === 'yes') {
          handlers.clear();
        } else {
          handlers.setValue('yes');
        }
      }}
      // {...config}
    />
  );
}
