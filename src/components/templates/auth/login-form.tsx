'use client';

import { useState } from 'react';
import { GoogleSignInButton } from '@/components/organisms/authentication/google-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import {
  loginWithPassword,
  requestMagicLink,
  verifyLoginTotp,
} from '@/server/actions/staff-auth.actions';

export function LoginForm({
  className,
  message,
  step,
  ...props
}: React.ComponentProps<'div'> & { message?: string; step?: string }) {
  const [error, setError] = useState<string | null>(message ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (step === 'totp') {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Two-factor code</CardTitle>
            <CardDescription>Enter the code from your authenticator app.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={async event => {
                event.preventDefault();
                setPending(true);
                setError(null);
                const result = await verifyLoginTotp(new FormData(event.currentTarget));
                setPending(false);
                if (result?.error) setError(result.error);
              }}
            >
              <FormInput name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={pending}>
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in with email or Google.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3"
            onSubmit={async event => {
              event.preventDefault();
              setPending(true);
              setError(null);
              const result = await loginWithPassword(new FormData(event.currentTarget));
              setPending(false);
              if (result?.error) setError(result.error);
            }}
          >
            <FormInput name="email" type="email" required autoComplete="email" placeholder="Email" />
            <FormInput name="password" type="password" required autoComplete="current-password" placeholder="Password" />
            <Button type="submit" disabled={pending}>
              Sign in
            </Button>
          </form>
          <form
            className="grid gap-3"
            onSubmit={async event => {
              event.preventDefault();
              setPending(true);
              setError(null);
              setInfo(null);
              const result = await requestMagicLink(new FormData(event.currentTarget));
              setPending(false);
              if (result.error) setError(result.error);
              if (result.message) setInfo(result.message);
            }}
          >
            <FormInput name="email" type="email" required autoComplete="email" placeholder="Email a sign-in link" />
            <Button type="submit" variant="outline" disabled={pending}>
              Email me a link
            </Button>
          </form>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  );
}
