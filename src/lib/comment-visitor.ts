import { createId } from '@paralleldrive/cuid2';
import { clientIp } from '@/server/lib/client-ip';
import { COMMENTER_COOKIE } from '@/server/services/comments.rules';

const ONE_YEAR = 60 * 60 * 24 * 365;
const VALID = /^[a-z0-9]{16,40}$/;

/** IP and commenter-cookie key for a comment API request. */
export function commentVisitor(request: Request) {
  // Per-visitor limits must not trust the client-written start of X-Forwarded-For.
  const ip = clientIp(request.headers);
  const raw = request.headers
    .get('cookie')
    ?.split(/;\s*/)
    .find(c => c.startsWith(`${COMMENTER_COOKIE}=`))
    ?.slice(COMMENTER_COOKIE.length + 1);
  const existing = raw && VALID.test(raw) ? raw : null;
  return { ip, existing, voterKey: existing ?? createId() };
}

/** Sets the commenter cookie on a response when the request didn't have one. */
export function withVisitorCookie(
  response: Response,
  visitor: { existing: string | null; voterKey: string }
) {
  if (!visitor.existing) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append(
      'Set-Cookie',
      `${COMMENTER_COOKIE}=${visitor.voterKey}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax${secure}`
    );
  }
  return response;
}
