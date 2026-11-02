import { OAuth2RequestError } from 'arctic';
import { cookies } from 'next/headers';

import { google } from '@/auth';
import { PAGES } from '@/config/pages';
import type { User } from '@/db/schemas/auth.schema';
import { UserStatus } from '@/db/schemas/shared.schema';
import { login } from '@/server/actions/auth.actions';
import { AuthService } from '@/server/services/auth.services';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { authRateLimitService } from '@/server/services/auth-rate-limit.service';

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

/**
 * Validates post-login next path to ensure it starts with a single '/'
 * and is not protocol-relative (R277 / A4-03).
 */
export function getSafeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return PAGES.DASHBOARD.ROOT;
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  return PAGES.DASHBOARD.ROOT;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // R278: Check origin host if present
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = request.headers.get('host') || url.host;
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

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // R276: Check rate limit / lockout for IP
  const ipLockout = await authRateLimitService.checkLockout(clientIp);
  if (ipLockout.locked) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'message',
      'Account or IP is temporarily locked. Please try again later.'
    );
    return Response.redirect(loginUrl.toString(), 302);
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

    // R276: Check lockout by email
    const emailLockout = await authRateLimitService.checkLockout(clientIp, user.email);
    if (emailLockout.locked) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'message',
        'Account is temporarily locked. Please try again later.'
      );
      return Response.redirect(loginUrl.toString(), 302);
    }

    const existingUser = await AuthService.findByEmail(user.email);

    // R271: Reject new accounts when public registration is disabled
    if (!existingUser && !authSettings.publicRegistrationEnabled) {
      await authRateLimitService.recordFailedLogin(clientIp, user.email);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'message',
        'Public registration is currently disabled.'
      );
      return Response.redirect(loginUrl.toString(), 302);
    }

    // R273: Reject when email verification required and missing
    if (authSettings.requireEmailVerification && !user.email_verified) {
      await authRateLimitService.recordFailedLogin(clientIp, user.email);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'message',
        'Email verification is required before signing in.'
      );
      return Response.redirect(loginUrl.toString(), 302);
    }

    // R272: Admin approval check for new and existing users
    if (!existingUser) {
      const isApproved = !authSettings.requireAdminApproval;
      const createUserInputs: User = {
        googleId: user.sub,
        name: user.name,
        email: user.email,
        emailVerified: user.email_verified,
        image: user.picture,
        status: isApproved ? UserStatus.Active : UserStatus.Inactive,
        approvedAt: isApproved ? new Date() : null,
      };

      const dbUser = await AuthService.create(createUserInputs);

      if (!isApproved) {
        // Pending approval: do not create session
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set(
          'message',
          'Your account has been created and is pending administrator approval.'
        );
        return Response.redirect(loginUrl.toString(), 302);
      }

      await authRateLimitService.clearFailedLogins(clientIp, user.email);
      await login(dbUser.id);
    } else {
      // Existing user checks
      if (existingUser.status !== UserStatus.Active) {
        await authRateLimitService.recordFailedLogin(clientIp, user.email);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('message', 'Account is inactive.');
        return Response.redirect(loginUrl.toString(), 302);
      }

      if (authSettings.requireAdminApproval && !existingUser.approvedAt) {
        await authRateLimitService.recordFailedLogin(clientIp, user.email);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set(
          'message',
          'Your account is pending administrator approval.'
        );
        return Response.redirect(loginUrl.toString(), 302);
      }

      // Update googleId and emailVerified if needed
      await AuthService.update(existingUser.id, {
        googleId: user.sub,
        emailVerified: user.email_verified,
        image: user.picture || existingUser.image,
      });

      await authRateLimitService.clearFailedLogins(clientIp, user.email);
      await login(existingUser.id);
    }

    const nextPath = getSafeNextPath(url.searchParams.get('next'));
    return new Response(null, {
      status: 302,
      headers: {
        Location: nextPath,
      },
    });
  } catch (e) {
    console.error(e);

    if (e instanceof OAuth2RequestError) {
      return new Response(null, {
        status: 400,
      });
    }

    return new Response(null, {
      status: 500,
    });
  }
}
