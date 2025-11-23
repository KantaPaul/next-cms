// import { ActionButton } from '@/components/atoms/action-button';
import { Grid } from '@/components/atoms/layout';
import { useSheet } from '@/components/organisms/sheet';
import { FilterItem } from './filter-item';
import type { DrawerFiltersProps, FilterConfig } from './types';
import { Button } from '@/components/ui/button';

interface TableDrawerFiltersProps extends DrawerFiltersProps {
  isDesktop?: boolean;
}

export function TableDrawerFilters({
  title,
  description,
  filters,
  isDesktop,
}: TableDrawerFiltersProps) {
  const { openSheet } = useSheet();

  function handleOpenDrawer() {
    openSheet({
      component: DrawerFilters,
      title,
      description,
      props: {
        filters,
      },
    });
  }

  if (!filters) return null;

  return (
    <Button className="rounded-md shadow-none" onClick={handleOpenDrawer}>
      {isDesktop ? 'More Filters' : 'Filters'}
    </Button>
  );
}

function DrawerFilters({ filters }: { filters?: FilterConfig[] }) {
  return (
    <Grid className="gap-4">
      {filters?.map(filter => (
        <FilterItem key={filter.name} showLabel={true} {...filter} />
      ))}
    </Grid>
  );
}
