import { Flex } from '@/components/atoms/layout';
import { handleOnChange, handleSelected, ReactSelect } from '@/components/atoms/react-select';
import useQueryParams from '@/hooks/useQueryParam';
import { cn } from '@/lib/utils/cn';
import Pagination, { type PaginationProps } from './pagination';

export const paginationLimitOptions = [10, 15, 20, 25, 50, 100].map((v) => ({
  label: String(v),
  value: String(v),
}));

export type TablePaginationProps = {
  pageSize: number;
  paginatorClassName?: string;
  page?: string;
} & PaginationProps;

export default function TablePagination({
  total,
  current,
  pageSize,
  className,
  page = '1',
  ...props
}: TablePaginationProps) {
  const { setQueryParams } = useQueryParams();

  if (!total) return null;

  return (
    <div
      className={cn(
        'table-pagination flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between',
        className
      )}
    >
      <Flex justify="start" className="w-auto">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <ReactSelect
          size="sm"
          menuPlacement="auto"
          isClearable={false}
          options={paginationLimitOptions}
          value={handleSelected(paginationLimitOptions, pageSize.toString())}
          onChange={(newValue) =>
            setQueryParams({ size: String(handleOnChange(newValue)), page: '1' })
          }
        />
      </Flex>
      <Pagination
        current={current}
        total={total}
        pageSize={pageSize}
        defaultCurrent={1}
        showLessItems={true}
        onChange={(page) => setQueryParams({ page: String(page) }, { scroll: false })}
        prevIconClassName="py-0 text-gray-500 !leading-[26px]"
        nextIconClassName="py-0 text-gray-500 !leading-[26px]"
        {...props}
      />
    </div>
  );
}
