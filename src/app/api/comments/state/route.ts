import { commentVisitor } from '@/lib/comment-visitor';
import { commentsService } from '@/server/services/comments.service';

/** This visitor's reactions and own comments on a post or entry (button states). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId')?.slice(0, 100);
  const targetKind =
    url.searchParams.get('targetKind') === 'entry' ? 'entry' : 'post';
  if (!postId) return Response.json({ reactions: {}, own: [] });
  const visitor = commentVisitor(request);
  const state = await commentsService.visitorState(
    postId,
    {
      ip: visitor.ip,
      voterKey: visitor.existing,
    },
    targetKind
  );
  return Response.json(state, { headers: { 'Cache-Control': 'private, no-store' } });
}
