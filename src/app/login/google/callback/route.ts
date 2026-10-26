import { OAuth2RequestError } from 'arctic';
import { cookies } from 'next/headers';

import { google } from '@/auth';
import { PAGES } from '@/config/pages';
import type { User } from '@/db/schemas/auth.schema';
import { UserStatus } from '@/db/schemas/shared.schema';
import { login } from '@/server/actions/auth.actions';
import { AuthService } from '@/server/services/auth.services';

export interface GoogleAuthResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_oauth_state')?.value ?? null;
  const codeVerifier = cookieStore.get('google_code_verifier')?.value ?? null;

  if (
    !code ||
    !state ||
    !storedState ||
    state !== storedState ||
    !codeVerifier
  ) {
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const response = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      }
    );
    const user: GoogleAuthResponse = await response.json();

    const createUserInputs: User = {
      googleId: user.sub,
      name: user.name,
      email: user.email,
      emailVerified: user.email_verified,
      image: user.picture,
      status: UserStatus.Active,
    };

    const dbUser = await AuthService.create(createUserInputs);

    await login(dbUser.id);

    return new Response(null, {
      status: 302,
      headers: {
        Location: PAGES.DASHBOARD.ROOT,
      },
    });
  } catch (e) {
    console.error(e);

    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }

    return new Response(null, {
      status: 500,
    });
  }
}
