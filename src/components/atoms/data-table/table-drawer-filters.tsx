// import { FilterItem } from '@/components/atoms/filter-toolbar/filter-item';
import type { FilterConfig } from '@/components/atoms/filter-toolbar/types';
import { Grid } from '@/components/atoms/layout';
// import { useSheet } from '@/components/organisms/sheet';

export type DrawerFiltersProps = {
  title?: string;
  description?: string;
  filters?: FilterConfig[];
};
export type TableDrawerFiltersProps = {
  isDesktop: boolean;
} & DrawerFiltersProps;

export function TableDrawerFilters({
  title,
  filters,
  isDesktop,
  description,
}: TableDrawerFiltersProps) {
  // const { openSheet } = useSheet();

  // function handleOpenDrawer() {
  //   openSheet({
  //     component: DrawerFilters,
  //     title,
  //     description,
  //     props: {
  //       filters,
  //     },
  //   });
  // }

  if (!filters) return null;
  // return (
  //   <ActionButton className="rounded-md shadow-none" onClick={handleOpenDrawer} size="sm">
  //     {isDesktop ? 'More Filters' : 'Filters'}
  //   </ActionButton>
  // );
}

function DrawerFilters({ filters }: { filters: FilterConfig[] }) {
  return (
    <Grid>
      {/* {filters?.map((filter) => (
        <FilterItem isDrawer key={filter.name} showLabel size="lg" {...filter} name={filter.name} />
      ))} */}
    </Grid>
  );
}
