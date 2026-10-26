import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { pages, posts } from '@/db/schema';
import { PageStatus } from '@/db/schemas/shared.schema';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { BoardBuilder } from '../../_components/board-builder';

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await analyticsBoardsService.get(id);
  if (!board) notFound();

  const [publishedPages, publishedPosts] = await Promise.all([
    db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(
        and(isNull(pages.deletedAt), eq(pages.status, PageStatus.published))
      )
      .orderBy(pages.title)
      .limit(200),
    db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(
        and(isNull(posts.deletedAt), eq(posts.status, PageStatus.published))
      )
      .orderBy(posts.title)
      .limit(200),
  ]);

  return (
    <BoardBuilder
      boardId={board.id}
      initialName={board.name}
      initialLayout={board.layout}
      publishedPages={publishedPages}
      publishedPosts={publishedPosts}
    />
  );
}
