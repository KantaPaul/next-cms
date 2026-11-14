import { validateSession } from '@/lib/auth';
import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { hasCategoryConsent } from '@/lib/consent';
import {
  checkPublicCors,
  handlePublicCorsOptions,
} from '@/server/lib/public-cors-site';
import { commentsService } from '@/server/services/comments.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { commentReactionSchema } from '@/schemas/api/comments';

export async function OPTIONS(request: Request) {
  return handlePublicCorsOptions(request);
}

/** Like (1), dislike (-1) or clear (0) a comment. Own comments are refused. */
export async function POST(request: Request) {
  const cors = await checkPublicCors(request);
  if (!cors.allowed) {
    return Response.json({ error: cors.reason ?? 'Forbidden' }, { status: 403 });
  }
  const parsed = commentReactionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid reaction.' },
      { status: 400, headers: cors.headers }
    );
  }
  const visitor = commentVisitor(request);
  const [session, settings] = await Promise.all([
    validateSession().catch(() => null),
    siteSettingsService.getPublic().catch(() => null),
  ]);
  const result = await commentsService.react(parsed.data, {
    ...visitor,
    userId: session?.user.id ?? null,
    userEmail: session?.user.email ?? null,
  });
  const allowFunctional = hasCategoryConsent(
    visitor.consentCookie,
    settings?.consent,
    'functional'
  );
  if (!result.ok) {
    return withVisitorCookie(
      Response.json(
        { error: result.error },
        { status: result.status, headers: cors.headers }
      ),
      visitor,
      allowFunctional
    );
  }
  return withVisitorCookie(
    Response.json(result, { headers: cors.headers }),
    visitor,
    allowFunctional
  );
}
