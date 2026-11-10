'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const ACTION_OPTIONS = [
  { value: 'email', label: 'Email notification' },
  { value: 'redirect', label: 'Redirect to URL' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'mailchimp', label: 'Mailchimp' },
];

type Props = {
  field: { label?: string };
  name: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
};

export function ContactFormActionsField({
  field,
  name,
  onChange,
  value,
}: Props) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (actionVal: string) => {
    if (selected.includes(actionVal)) {
      onChange(selected.filter(a => a !== actionVal));
    } else {
      onChange([...selected, actionVal]);
    }
  };

  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {field.label || 'Actions after submit'}
      </Label>
      <div className="space-y-2 rounded-md border p-3">
        {ACTION_OPTIONS.map(opt => {
          const checked = selected.includes(opt.value);
          const id = `${name}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => toggle(opt.value)}
              />
              <Label
                htmlFor={id}
                className="text-xs font-medium cursor-pointer"
              >
                {opt.label}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
