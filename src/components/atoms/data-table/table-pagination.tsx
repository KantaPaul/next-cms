import { type JSX, useTransition } from 'react';
import { Text } from '@/components/atoms/content';
import { SimplifiedPagination } from '@/components/atoms/data-table/pagination';
import { Flex } from '@/components/atoms/layout';
import {
  handleSelected,
  type Option,
  ReactSelect,
} from '@/components/atoms/react-select';
import { DEFAULT_PAGE_SIZE } from '@/config/constant';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';

interface TablePaginationProps {
  className?: string;
  totalCount?: number;
  pageSizes?: number[];
}

export function TablePagination({
  className,
  totalCount,
  pageSizes,
}: Readonly<TablePaginationProps>): JSX.Element {
  const [isPending, startTransition] = useTransition();
  const { queryParams, setQueryParams } = useQueryParams();
  const layout = queryParams?.layout;

  // Set default page sizes based on layout
  const defaultPageSizes =
    layout === 'grid' ? [6, 12, 24, 36, 48, 60] : [5, 10, 20, 30, 40, 50];
  const finalPageSizes = pageSizes || defaultPageSizes;

  // Set default page size based on layout
  const defaultPageSize =
    layout === 'grid' ? DEFAULT_PAGE_SIZE + 2 : DEFAULT_PAGE_SIZE;
  const pageSize = queryParams?.size ?? defaultPageSize;
  const pageSizeOptions = finalPageSizes?.map(size => ({
    value: size.toString(),
    label: size.toString(),
  }));
  return (
    <Flex
      className={cn(
        'PROA--Table-Pagination flex-col justify-center gap-4 md:flex-row',
        className
      )}
    >
      <Flex className="justify-center gap-2 md:justify-start">
        <Text className="whitespace-nowrap font-medium">Rows per page</Text>
        <ReactSelect
          isSearchable={false}
          isClearable={false}
          size="md"
          menuPlacement="top"
          placeholder=""
          className="max-w-20"
          value={handleSelected(pageSizeOptions, pageSize.toString())}
          options={pageSizeOptions}
          isLoading={isPending}
          onChange={newValue => {
            startTransition(() =>
              setQueryParams({
                size: (newValue as Option).value,
                page: '1',
              })
            );
          }}
        />
      </Flex>
      <SimplifiedPagination totalCount={totalCount} pageSize={pageSize} />
    </Flex>
  );
}
