import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react';
import { useTransition } from 'react';

// import { ActionIcon } from '@/components/atoms/button/action-icon';
import { Box } from '@/components/atoms/layout';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

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

  // Handle undefined totalCount
  if (!totalCount || totalCount <= 0) {
    return null;
  }

  const currentPage = Number.parseInt(queryParams.page) || 1;
  const currentSize = Number.parseInt(queryParams.size) || pageSize;
  const totalPages = Math.ceil(totalCount / currentSize);

  function handlePageChange(page: number) {
    startTransition(() => {
      setQueryParams(
        {
          page,
          size: currentSize,
        },
        {
          scroll: false,
        }
      );
    });
  }

  function renderPageButtons() {
    const buttons = [];

    // If 7 or fewer pages, show all
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(renderPageButton(i));
      }

      return buttons;
    }

    // Always show first page
    buttons.push(renderPageButton(1));

    if (currentPage <= 4) {
      // Near beginning: [1] [2] [3] [4] [5] ... [10]
      for (let i = 2; i <= 5; i++) {
        buttons.push(renderPageButton(i));
      }

      buttons.push(
        <span key="ellipsis" className="px-2">
          <Ellipsis className="h-4 w-4" />
        </span>
      );
      buttons.push(renderPageButton(totalPages));
    } else if (currentPage >= totalPages - 3) {
      // Near end: [1] ... [6] [7] [8] [9] [10]
      buttons.push(
        <span key="ellipsis" className="px-2">
          <Ellipsis className="h-4 w-4" />
        </span>
      );

      for (let i = totalPages - 4; i <= totalPages; i++) {
        buttons.push(renderPageButton(i));
      }
    } else {
      // Middle: [1] ... [3] [4] [5] [6] [7] ... [10]
      buttons.push(
        <span key="ellipsis1" className="px-2">
          <Ellipsis className="h-4 w-4" />
        </span>
      );

      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        buttons.push(renderPageButton(i));
      }

      buttons.push(
        <span key="ellipsis2" className="px-2">
          <Ellipsis className="h-4 w-4" />
        </span>
      );
      buttons.push(renderPageButton(totalPages));
    }

    return buttons;
  }

  const renderPageButton = (pageNumber: number) => {
    // Don't render if page number is invalid
    if (!pageNumber || pageNumber < 1 || pageNumber > totalPages) {
      return null;
    }

    return (
      <Button
        key={pageNumber}
        disabled={isPending}
        onClick={() => handlePageChange(pageNumber)}
        className={cn(
          'mx-1 border border-steel-100 shadow-none transition-none dark:border-dark-300',
          currentPage === pageNumber
            ? 'border-steel-700 bg-steel-700 text-white hover:text-white dark:bg-dark-300 dark:text-white'
            : 'bg-white text-steel-700 dark:bg-dark-50 dark:text-dark-700 dark:hover:bg-dark-300'
        )}
      >
        {pageNumber}
      </Button>
    );
  };

  return (
    <Box className="flex items-center justify-center gap-2">
      {/* Previous page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || isPending}
        className="border border-steel-100 shadow-none dark:border-dark-300 dark:text-dark-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      <div className="flex items-center">{renderPageButtons()}</div>

      {/* Next page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isPending}
        className="border border-steel-100 shadow-none dark:border-dark-300 dark:text-dark-700"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </Box>
  );
}
