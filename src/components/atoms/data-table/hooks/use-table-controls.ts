import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isFunction from 'lodash/isFunction';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_PAGE_SIZE } from '@/config/constant';
import {
  createPersonalizedSection,
  updatePersonalizedSection,
} from '@/db/common/personalizations/personalization.actions';
import type { PersonalizedProps } from '@/components/atoms/data-table/types';

// const safeQuerySchema =(defaults)=> z.object({
//   q: z.string().optional(),
//   page: z.number().optional().default(defaults.page),
//   limit: z.number().optional(),
//   sortBy: z.string().optional(),
//   orderBy: z.string().optional(),
// });

type UseTableControlsOptions = {
  includeKeys: string[];
  excludeKeys: string[];
  pagination: PaginationState;
  sort: string;
  order: string;
  personalizedProps?: PersonalizedProps;
};

export function useTableControls(options?: Partial<UseTableControlsOptions>) {
  const _defs: UseTableControlsOptions = {
    includeKeys: ['search', 'size', 'sort', 'order'],
    excludeKeys: ['search', 'page', 'size', 'sort', 'order'],
    pagination: {
      pageSize: Number(DEFAULT_PAGE_SIZE),
      pageIndex: 0,
    },
    sort: 'id',
    order: 'ase',
    ...options,
  } as const;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const limit = searchParams.get('size') ?? _defs?.personalizedProps?.limit?.toString();
  const field = searchParams.get('sort');
  const order = searchParams.get('order');

  const pagination = {
    pageSize: limit ? Number.parseInt(limit) : _defs.pagination.pageSize,
    pageIndex: page ? Number.parseInt(page) : _defs.pagination.pageIndex,
  };
  const sorting = [
    {
      id: field ?? _defs.sort,
      desc: order ? order === 'desc' : _defs.order === 'desc',
    },
  ];
  const columnFilters: ColumnFiltersState = [];

  for (const [key, value] of searchParams.entries()) {
    if (!_defs.excludeKeys.includes(key)) {
      if (key.endsWith('[]')) {
        columnFilters.push({
          id: key.slice(0, -2),
          value: value.split(','),
        });
      } else {
        columnFilters.push({ id: key, value });
      }
    }
  }

  const onPaginationChange: OnChangeFn<PaginationState> = async (updaterOrValue) => {
    const { pageIndex, pageSize } = isFunction(updaterOrValue)
      ? updaterOrValue(pagination)
      : updaterOrValue;
    const urlSearchParams = new URLSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      page: pageIndex.toString(),
      size: pageSize.toString(),
    });

    if (_defs.personalizedProps && !isEqual(pagination.pageSize, pageSize)) {
      if (_defs.personalizedProps.id) {
        await updatePersonalizedSection({
          id: _defs.personalizedProps.id,
          limit: pageSize,
        });
      } else {
        await createPersonalizedSection({
          pathname: _defs.personalizedProps.pathname,
          dataset: _defs.personalizedProps.dataset,
          limit: pageSize,
        });
      }
    }

    //TODO: add transition to the new URL
    router.replace(`${pathname}/?${urlSearchParams.toString()}`);
  };

  const onSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const [sort_by] = isFunction(updaterOrValue) ? updaterOrValue(sorting) : updaterOrValue;
    const { sort, order, page, ...includes } = Object.fromEntries(searchParams.entries());
    const urlSearchParams = new URLSearchParams({
      ...includes,
      ...(!isEmpty(sort_by) && {
        sort: sort_by.id,
        order: sort_by.desc ? 'desc' : 'asc',
      }),
      page: '0',
    });
    //TODO: add transition to the new URL
    //TODO: handle undefined sortBy and orderBy
    router.replace(`${pathname}?${urlSearchParams.toString()}`);
  };

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updaterOrValue) => {
    const filters = isFunction(updaterOrValue) ? updaterOrValue(columnFilters) : updaterOrValue;
    const includes = _defs.includeKeys
      .map((key) => [key, searchParams.get(key)])
      .filter(([_, value]) => value) as [string, string][];
    const urlSearchParams = new URLSearchParams([
      ...includes,
      ...filters.map(({ id, value }) => {
        if (Array.isArray(value as string[])) {
          return [`${id}[]`, (value as string[]).join(',')];
        }

        return [id, value as string];
      }),
    ]);
    //TODO: add transition to the new URL
    //TODO: handle undefined sortBy and orderBy
    router.replace(`${pathname}?${urlSearchParams.toString()}`);
  };

  return {
    onPaginationChange,
    pagination,
    sorting,
    onSortingChange,
    columnFilters,
    onColumnFiltersChange,
  };
}
