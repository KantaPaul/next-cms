import { type ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { generateCodeVerifier, generateState } from 'arctic';

import { google } from '@/auth';

export async function GET(): Promise<Response> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['email', 'profile']);
  url.searchParams.set('access_type', 'offline');

  const cookieConfig: Partial<ResponseCookie> = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax',
  };

  const cookieStore = await cookies();

  cookieStore.set('google_oauth_state', state, cookieConfig);

  cookieStore.set('google_code_verifier', codeVerifier, cookieConfig);

  return Response.redirect(url);
}
