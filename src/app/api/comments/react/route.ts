import { validateSession } from '@/lib/auth';
import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { hasCategoryConsent } from '@/lib/consent';
import { commentsService } from '@/server/services/comments.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { commentReactionSchema } from '@/schemas/api/comments';

/** Like (1), dislike (-1) or clear (0) a comment. Own comments are refused. */
export async function POST(request: Request) {
  const parsed = commentReactionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: 'Invalid reaction.' }, { status: 400 });
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
      Response.json({ error: result.error }, { status: result.status }),
      visitor,
      allowFunctional
    );
  }
  return withVisitorCookie(Response.json(result), visitor, allowFunctional);
}
