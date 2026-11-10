import { validateSession } from '@/lib/auth';
import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { hasCategoryConsent } from '@/lib/consent';
import { commentsService } from '@/server/services/comments.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

/** Visitor or signed-in comment submission from the Comments block. */
export async function POST(request: Request) {
  const [formData, session] = await Promise.all([
    request.formData(),
    validateSession().catch(() => null),
  ]);
  const visitor = commentVisitor(request);
  const result = await commentsService.submit(formData, {
    ip: visitor.ip,
    voterKey: visitor.voterKey,
    userAgent: request.headers.get('user-agent') ?? '',
    user: session
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          website: session.user.website,
        }
      : null,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  const settings = await siteSettingsService.getPublic().catch(() => null);
  const allowFunctional = hasCategoryConsent(
    visitor.consentCookie,
    settings?.consent,
    'functional'
  );
  return withVisitorCookie(
    Response.json({ ok: true, status: result.commentStatus }),
    visitor,
    allowFunctional
  );
}
