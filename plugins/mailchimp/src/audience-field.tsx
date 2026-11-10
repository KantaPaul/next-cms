'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';

type Audience = { id: string; name: string };

type Props = {
  field: { label?: string };
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
};

export function MailchimpAudienceField({
  field,
  name,
  onChange,
  value,
}: Props) {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/plugins/mailchimp/lists')
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.lists) {
          setAudiences(data.lists);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load audiences'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium">
        {field.label || 'Mailchimp Audience'}
      </Label>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading audiences…</p>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : audiences.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No audiences found. Ensure your Mailchimp API key is saved in
          Dashboard &gt; Plugins &gt; Mailchimp.
        </div>
      ) : (
        <select
          id={name}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Select an audience…</option>
          {audiences.map(a => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.id})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
