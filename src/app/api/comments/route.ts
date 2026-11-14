import { validateSession } from '@/lib/auth';
import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { hasCategoryConsent } from '@/lib/consent';
import {
  checkPublicCors,
  handlePublicCorsOptions,
} from '@/server/lib/public-cors-site';
import { commentsService } from '@/server/services/comments.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

export async function OPTIONS(request: Request) {
  return handlePublicCorsOptions(request);
}

/** Visitor or signed-in comment submission from the Comments block. */
export async function POST(request: Request) {
  const cors = await checkPublicCors(request);
  if (!cors.allowed) {
    return Response.json({ error: cors.reason ?? 'Forbidden' }, { status: 403 });
  }
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
    return Response.json(
      { error: result.error },
      { status: result.status, headers: cors.headers }
    );
  }
  const settings = await siteSettingsService.getPublic().catch(() => null);
  const allowFunctional = hasCategoryConsent(
    visitor.consentCookie,
    settings?.consent,
    'functional'
  );
  return withVisitorCookie(
    Response.json(
      { ok: true, status: result.commentStatus },
      { headers: cors.headers }
    ),
    visitor,
    allowFunctional
  );
}
