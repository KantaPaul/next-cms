import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PAGES } from '@/config/pages';
import { analyticsBoardsService } from '@/server/services/analytics-boards.service';
import { CreateBoardButton } from './_components/create-board-button';
import { DeleteBoardButton } from './_components/delete-board-button';

export default async function AnalyticsBoardsPage() {
  const boards = await analyticsBoardsService.list();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboards</h1>
          <p className="mt-1 text-sm text-steel-500 dark:text-steel-400">
            Named analytics boards with custom widgets over page-view data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={PAGES.DASHBOARD.ANALYTICS}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-sm text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
          >
            Trends
          </Link>
          <CreateBoardButton />
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-steel-200 px-6 py-16 text-center dark:border-dark-300">
          <p className="text-sm text-steel-500">
            No dashboards yet. Create one to start building with stats, charts,
            and tables.
          </p>
          <CreateBoardButton />
        </div>
      ) : (
        <ul className="divide-y divide-steel-100 rounded-lg border border-steel-200 dark:divide-dark-300 dark:border-dark-300">
          {boards.map(board => (
            <li
              key={board.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={PAGES.DASHBOARD.ANALYTICS_BOARD(board.id)}
                  className="font-medium hover:underline"
                >
                  {board.name}
                </Link>
                <div className="mt-0.5 text-xs text-steel-500">
                  {board.widgetCount} widget{board.widgetCount === 1 ? '' : 's'}
                  {board.updatedAt && (
                    <>
                      {' · updated '}
                      {new Date(board.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={PAGES.DASHBOARD.ANALYTICS_BOARD(board.id)}
                  className="rounded-md border border-steel-200 px-2.5 py-1 text-sm hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
                >
                  Open
                </Link>
                <Link
                  href={PAGES.DASHBOARD.ANALYTICS_BOARD_EDIT(board.id)}
                  className="rounded-md border border-steel-200 px-2.5 py-1 text-sm hover:bg-steel-50 dark:border-dark-300 dark:hover:bg-dark-200"
                >
                  Edit
                </Link>
                <DeleteBoardButton id={board.id} name={board.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
