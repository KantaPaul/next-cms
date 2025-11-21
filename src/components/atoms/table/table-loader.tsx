'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils/cn';

export function TableLoader(props: {
  rows?: number;
  hidePagination?: boolean;
  className?: string;
}) {
  const { rows = 5, hidePagination = false, className } = props;

  return (
    <div className={cn('flex w-full animate-pulse flex-col', className)}>
      {/* <div className="flex items-center justify-center mb-5 w-full">
        <div className="flex w-36 h-5 bg-slate-200" />
        <div className="flex w-10 h-10 bg-slate-200 rounded-md" />
      </div> */}
      <div className="scrollbar-x flex w-full overflow-x-auto pb-2">
        <div className="grid w-full min-w-[800px] grid-cols-8">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              className="flex h-full flex-col divide-y divide-steel-200 border-steel-200/70 border-r border-b last:border-r-0 dark:divide-steel-600 dark:border-steel-600/70"
              key={`table-column-${idx}`}
            >
              <div className="flex h-10 w-full items-center justify-center bg-steel-200 px-4 dark:bg-steel-700">
                <div className="flex h-5 w-full bg-steel-200 dark:bg-steel-600" />
              </div>
              {Array.from({ length: rows }).map((_, idx) => (
                <Fragment key={`table-cell-${idx}`}>
                  <div className="flex h-10 w-full items-center justify-center px-4">
                    <div className="flex h-5 w-full bg-steel-200/80 dark:bg-steel-600/80" />
                  </div>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>

      {!hidePagination && (
        <div className="flex w-full items-center justify-center py-5 sm:justify-between">
          <div className="hidden items-center gap-x-2 sm:flex">
            <div className="flex h-5 w-32 bg-steel-200/70 dark:bg-steel-600/80" />
            <div className="flex h-9 w-20 rounded-md bg-steel-200/70 dark:bg-steel-600/80" />
          </div>
          <div className="flex items-center">
            <div className="flex h-9 w-9 rounded-full bg-steel-200/70 dark:bg-steel-600/80" />
            <span className="flex h-9 w-9 items-center justify-center rounded-md font-medium text-sm text-steel-500">
              1
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-md font-medium text-sm text-steel-500">
              2
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-md font-medium text-sm text-steel-500">
              3
            </span>
            <div className="flex h-9 w-9 rounded-full bg-steel-200/70 dark:bg-steel-600/80" />
          </div>
        </div>
      )}
    </div>
  );
}
