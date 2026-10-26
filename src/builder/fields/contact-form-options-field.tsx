'use client';

import { usePuck } from '@measured/puck';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  field: { label?: string };
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
};

const OPTION_TYPES = new Set(['select', 'radio']);

/** Array item index for this options field (`fields[2].options` → 2). */
function itemIndex(name: string) {
  const matches = [...name.matchAll(/\[(\d+)\]/g)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : -1;
}

export function ContactFormOptionsField({
  field,
  name,
  onChange,
  value,
}: Props) {
  const { selectedItem } = usePuck();
  const index = itemIndex(name);
  const fields = selectedItem?.props?.fields;
  const rawType =
    Array.isArray(fields) && index >= 0 ? fields[index]?.type : undefined;
  const fieldType = typeof rawType === 'string' ? rawType : undefined;

  if (!fieldType || !OPTION_TYPES.has(fieldType)) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {field.label || 'Options'}
      </Label>
      <Textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        rows={3}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={'Option 1\nOption 2'}
        id={name}
      />
    </div>
  );
}
