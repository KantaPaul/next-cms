import { generateCodeVerifier, generateState } from 'arctic';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { cookies } from 'next/headers';
import { google } from '@/auth';
import { siteSettingsService } from '@/server/services/site-settings.service';

export async function GET(request: Request): Promise<Response> {
  // R278: Check origin if present
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = request.headers.get('host') || new URL(request.url).host;
      if (originHost !== host) {
        return new Response('Forbidden', { status: 403 });
      }
    } catch {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // R270: Reject when login is disabled
  const authSettings = await siteSettingsService.getAuthSettings();
  if (!authSettings.loginEnabled) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'message',
      authSettings.loginDisabledMessage || 'Login is currently disabled.'
    );
    return Response.redirect(loginUrl.toString(), 302);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    'email',
    'profile',
  ]);
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
