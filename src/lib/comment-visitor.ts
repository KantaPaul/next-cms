import { createId } from '@paralleldrive/cuid2';
import { CONSENT_COOKIE_NAME, readCookieFromHeader } from '@/lib/consent';
import { clientIp } from '@/server/lib/client-ip';
import { COMMENTER_COOKIE } from '@/server/services/comments.rules';

const ONE_YEAR = 60 * 60 * 24 * 365;
const VALID = /^[a-z0-9]{16,40}$/;

/** IP and commenter-cookie key for a comment API request. */
export function commentVisitor(request: Request) {
  // Per-visitor limits must not trust the client-written start of X-Forwarded-For.
  const ip = clientIp(request.headers);
  const cookieHeader = request.headers.get('cookie');
  const raw = readCookieFromHeader(cookieHeader, COMMENTER_COOKIE);
  const consentCookie = readCookieFromHeader(cookieHeader, CONSENT_COOKIE_NAME);
  const existing = raw && VALID.test(raw) ? raw : null;
  return { ip, existing, voterKey: existing ?? createId(), consentCookie };
}

/** Sets the commenter cookie on a response when the request didn't have one and functional cookies are allowed. */
export function withVisitorCookie(
  response: Response,
  visitor: { existing: string | null; voterKey: string },
  allowFunctionalCookie = true
) {
  if (!visitor.existing && allowFunctionalCookie) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append(
      'Set-Cookie',
      `${COMMENTER_COOKIE}=${visitor.voterKey}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure}`
    );
  }
  return response;
}
