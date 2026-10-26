'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/input';
import {
  disableTotp,
  enableTotp,
  setPassword,
} from '@/server/actions/staff-auth.actions';

export function AccountForms({
  hasPassword,
  totp,
}: {
  hasPassword: boolean;
  totp: { secret: string; uri: string; enabled: boolean } | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid max-w-lg gap-8">
      <form
        className="grid gap-3"
        onSubmit={async event => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const result = await setPassword(new FormData(event.currentTarget));
          if (result.error) setError(result.error);
          if (result.message) {
            setMessage(result.message);
            router.refresh();
          }
        }}
      >
        <h2 className="text-lg font-medium">Password</h2>
        {hasPassword && (
          <FormInput
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            required
          />
        )}
        <FormInput
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          required
          minLength={8}
        />
        <Button type="submit" className="justify-self-start">
          Save password
        </Button>
      </form>

      {totp && (
        <form
          className="grid gap-3"
          onSubmit={async event => {
            event.preventDefault();
            setError(null);
            setMessage(null);
            const data = new FormData(event.currentTarget);
            const result = totp.enabled ? await disableTotp(data) : await enableTotp(data);
            if (result.error) setError(result.error);
            if (result.message) {
              setMessage(result.message);
              router.refresh();
            }
          }}
        >
          <h2 className="text-lg font-medium">Two-factor authentication</h2>
          <p className="text-sm text-muted-foreground">
            {totp.enabled
              ? 'Enter a current code to turn this off.'
              : 'Add this secret to an authenticator app, then enter a code to turn it on.'}
          </p>
          {!totp.enabled && (
            <>
              <code className="break-all rounded bg-muted px-2 py-1 text-sm">{totp.secret}</code>
              <p className="break-all text-xs text-muted-foreground">{totp.uri}</p>
            </>
          )}
          <FormInput name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" />
          <Button type="submit" variant="outline" className="justify-self-start">
            {totp.enabled ? 'Turn off' : 'Turn on'}
          </Button>
        </form>
      )}
      {message && <p className="text-sm">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
