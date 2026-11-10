import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { hasCategoryConsent } from '@/lib/consent';
import { commentsService } from '@/server/services/comments.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

/** Visitor comment submission from the Comments block. Saved as pending. */
export async function POST(request: Request) {
  const formData = await request.formData();
  const visitor = commentVisitor(request);
  const result = await commentsService.submit(formData, {
    ip: visitor.ip,
    voterKey: visitor.voterKey,
    userAgent: request.headers.get('user-agent') ?? '',
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
  return withVisitorCookie(Response.json({ ok: true }), visitor, allowFunctional);
}
