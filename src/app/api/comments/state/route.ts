import { commentVisitor } from '@/lib/comment-visitor';
import { commentsService } from '@/server/services/comments.service';

/** This visitor's reactions and own comments on a post (button states). */
export async function GET(request: Request) {
  const postId = new URL(request.url).searchParams.get('postId')?.slice(0, 100);
  if (!postId) return Response.json({ reactions: {}, own: [] });
  const visitor = commentVisitor(request);
  const state = await commentsService.visitorState(postId, {
    ip: visitor.ip,
    voterKey: visitor.existing,
  });
  return Response.json(state, { headers: { 'Cache-Control': 'private, no-store' } });
}
