import { commentVisitor, withVisitorCookie } from '@/lib/comment-visitor';
import { commentsService } from '@/server/services/comments.service';
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
  const result = await commentsService.react(parsed.data, visitor);
  if (!result.ok) {
    return withVisitorCookie(
      Response.json({ error: result.error }, { status: result.status }),
      visitor
    );
  }
  return withVisitorCookie(Response.json(result), visitor);
}
