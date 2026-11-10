import { validateSession } from '@/lib/auth';
import { commentVisitor } from '@/lib/comment-visitor';
import { commentsService } from '@/server/services/comments.service';

/** This visitor's reactions, own comments, and signed-in commenter profile (if any). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId')?.slice(0, 100);
  const targetKind =
    url.searchParams.get('targetKind') === 'entry' ? 'entry' : 'post';
  const session = await validateSession().catch(() => null);
  const user = session
    ? {
        name: session.user.name?.trim() || session.user.email,
        email: session.user.email,
        website: session.user.website?.trim() || null,
      }
    : null;
  if (!postId) {
    return Response.json(
      { reactions: {}, own: [], user },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  const visitor = commentVisitor(request);
  const state = await commentsService.visitorState(
    postId,
    {
      ip: visitor.ip,
      voterKey: visitor.existing,
      userId: session?.user.id ?? null,
      userEmail: session?.user.email ?? null,
    },
    targetKind
  );
  return Response.json(
    { ...state, user },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
