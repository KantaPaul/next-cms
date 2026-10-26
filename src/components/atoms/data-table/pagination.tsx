'use client';

import { useTransition } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';

interface SimplifiedPaginationProps {
  pageSize?: number;
  totalCount?: number;
}

export function SimplifiedPagination({
  totalCount,
  pageSize = 10,
}: Readonly<SimplifiedPaginationProps>) {
  const [isPending, startTransition] = useTransition();
  const { queryParams, setQueryParams } = useQueryParams();

  if (!totalCount || totalCount <= 0) {
    return null;
  }

  const currentPage = Number.parseInt(queryParams.page) || 1;
  const currentSize = Number.parseInt(queryParams.size) || pageSize;
  const totalPages = Math.ceil(totalCount / currentSize);

  if (totalPages <= 1) {
    return null;
  }

  function handlePageChange(page: number) {
    startTransition(() => {
      setQueryParams(
        {
          page: String(page),
          size: String(currentSize),
        },
        {
          scroll: false,
        }
      );
    });
  }

  function renderPageItems() {
    const items = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              aria-disabled={isPending}
              onClick={e => {
                e.preventDefault();
                handlePageChange(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      return items;
    }

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          isActive={currentPage === 1}
          aria-disabled={isPending}
          onClick={e => {
            e.preventDefault();
            handlePageChange(1);
          }}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (currentPage <= 4) {
      for (let i = 2; i <= 5; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              aria-disabled={isPending}
              onClick={e => {
                e.preventDefault();
                handlePageChange(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={currentPage === totalPages}
            aria-disabled={isPending}
            onClick={e => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    } else if (currentPage >= totalPages - 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
      for (let i = totalPages - 4; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              aria-disabled={isPending}
              onClick={e => {
                e.preventDefault();
                handlePageChange(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={currentPage === i}
              aria-disabled={isPending}
              onClick={e => {
                e.preventDefault();
                handlePageChange(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={currentPage === totalPages}
            aria-disabled={isPending}
            onClick={e => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  }

  return (
    <Pagination className="w-auto mx-0">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={e => {
              e.preventDefault();
              if (currentPage > 1) handlePageChange(currentPage - 1);
            }}
            aria-disabled={currentPage === 1 || isPending}
            className={cn(
              (currentPage === 1 || isPending) &&
                'pointer-events-none opacity-50'
            )}
          />
        </PaginationItem>

        {renderPageItems()}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={e => {
              e.preventDefault();
              if (currentPage < totalPages) handlePageChange(currentPage + 1);
            }}
            aria-disabled={currentPage === totalPages || isPending}
            className={cn(
              (currentPage === totalPages || isPending) &&
                'pointer-events-none opacity-50'
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
