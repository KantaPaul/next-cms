'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/input';
import { updateAuthorProfile } from '@/server/actions/profile.actions';
import {
  disableTotp,
  enableTotp,
  setPassword,
} from '@/server/actions/staff-auth.actions';

export function AccountForms({
  profile,
  hasPassword,
  totp,
}: {
  profile: {
    name: string;
    image: string;
    bio: string;
    jobTitle: string;
    website: string;
    social: { x?: string; linkedin?: string; github?: string; instagram?: string };
  };
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
          const result = await updateAuthorProfile(
            new FormData(event.currentTarget)
          );
          if (result.error) setError(result.error);
          if (result.message) {
            setMessage(result.message);
            router.refresh();
          }
        }}
      >
        <h2 className="text-lg font-medium">Public author profile</h2>
        <p className="text-sm text-steel-500">
          Shown on posts you write, in the Author bio and Author card blocks and post meta.
        </p>
        <FormInput
          name="name"
          defaultValue={profile.name}
          placeholder="Display name"
          maxLength={100}
          aria-label="Display name"
        />
        <FormInput
          name="image"
          defaultValue={profile.image}
          placeholder="Avatar URL (https://… or /media/…)"
          maxLength={500}
          aria-label="Avatar URL"
        />
        <textarea
          name="bio"
          defaultValue={profile.bio}
          rows={4}
          maxLength={600}
          placeholder="A sentence or two about you"
          aria-label="Bio"
          className="w-full rounded-md border border-steel-200 bg-transparent px-3 py-2 text-sm dark:border-dark-300"
        />
        <FormInput
          name="jobTitle"
          defaultValue={profile.jobTitle}
          placeholder="Job title (e.g. Senior editor)"
          maxLength={120}
          aria-label="Job title"
        />
        <FormInput
          name="website"
          type="url"
          defaultValue={profile.website}
          placeholder="Website (https://…)"
          maxLength={300}
          aria-label="Website"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['x', 'X profile URL'],
              ['linkedin', 'LinkedIn profile URL'],
              ['github', 'GitHub profile URL'],
              ['instagram', 'Instagram profile URL'],
            ] as const
          ).map(([key, label]) => (
            <FormInput
              key={key}
              name={key}
              type="url"
              defaultValue={profile.social[key] ?? ''}
              placeholder={`${label} (https://…)`}
              maxLength={300}
              aria-label={label}
            />
          ))}
        </div>
        <Button type="submit" className="justify-self-start">
          Save profile
        </Button>
      </form>
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
