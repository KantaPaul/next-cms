import { and, eq, isNull } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import { pages, posts } from '@/db/schema';
import { PageStatus } from '@/db/schemas/shared.schema';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { BoardBuilder } from '../../_components/board-builder';

export default async function BoardEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ legacy?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (sp?.legacy !== '1') {
    redirect(PAGES.DASHBOARD.ANALYTICS_BOARD_BUILDER(id));
  }
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
