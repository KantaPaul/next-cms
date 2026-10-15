'use client';

import * as React from 'react';
import {
  Pagination as UiPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils/cn';

export const localeDefault = {
  items_per_page: '/ page',
  jump_to: 'Go to',
  jump_to_confirm: 'confirm',
  page: 'Page',
  prev_page: 'Previous Page',
  next_page: 'Next Page',
  prev_5: 'Previous 5 Pages',
  next_5: 'Next 5 Pages',
  prev_3: 'Previous 3 Pages',
  next_3: 'Next 3 Pages',
  page_size: 'Page Size',
};

export interface PaginationProps {
  current?: number;
  total?: number;
  pageSize?: number;
  defaultCurrent?: number;
  onChange?: (page: number) => void;
  className?: string;
  showLessItems?: boolean;
  outline?: boolean;
  rounded?: string;
  variant?: string;
  color?: string;
  [key: string]: any;
}

export const PrevIcon = () => null;
export const NextIcon = () => null;

export default function Pagination({
  current = 1,
  total = 0,
  pageSize = 10,
  onChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(total / (pageSize || 10));

  if (totalPages <= 1) {
    return null;
  }

  const renderPageItems = () => {
    const items: React.ReactNode[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={current === i}
              onClick={(e) => {
                e.preventDefault();
                onChange?.(i);
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      return items;
    }

    // Always show page 1
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          isActive={current === 1}
          onClick={(e) => {
            e.preventDefault();
            onChange?.(1);
          }}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (current <= 4) {
      for (let i = 2; i <= 5; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={current === i}
              onClick={(e) => {
                e.preventDefault();
                onChange?.(i);
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
            isActive={current === totalPages}
            onClick={(e) => {
              e.preventDefault();
              onChange?.(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    } else if (current >= totalPages - 3) {
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
              isActive={current === i}
              onClick={(e) => {
                e.preventDefault();
                onChange?.(i);
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
      for (let i = current - 1; i <= current + 1; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={current === i}
              onClick={(e) => {
                e.preventDefault();
                onChange?.(i);
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
            isActive={current === totalPages}
            onClick={(e) => {
              e.preventDefault();
              onChange?.(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <UiPagination className={cn('justify-end', className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (current > 1) onChange?.(current - 1);
            }}
            aria-disabled={current <= 1}
            className={cn(current <= 1 && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>

        {renderPageItems()}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (current < totalPages) onChange?.(current + 1);
            }}
            aria-disabled={current >= totalPages}
            className={cn(current >= totalPages && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
      </PaginationContent>
    </UiPagination>
  );
}

Pagination.displayName = 'Pagination';
