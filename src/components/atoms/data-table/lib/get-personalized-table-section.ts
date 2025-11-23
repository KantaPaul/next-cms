import type { personalizationQuery } from '@/db/common/personalizations/personalization.queries';
import type { PersonalizationDataset } from '@/db/schema';
import type { PromiseResult } from '@/lib/types';
import appConfig from '@/lib/types/app.config';

// PersonalizedProps
type PersonalizationProps = PromiseResult<
  typeof personalizationQuery.getByPathname
>;

export function getPersonalizedTableSection({
  personalization,
  dataset,
  pathname,
  columnControl,
}: {
  personalization?: PersonalizationProps;
  dataset: PersonalizationDataset;
  pathname: string;
  columnControl?: boolean;
}) {
  const exist = personalization?.sections?.find(
    section => section.dataset === dataset
  );

  if (!exist) {
    return {
      pathname,
      dataset,
      limit: appConfig.tableItemsPerPage,
      columnControl,
    };
  }

  const { visibility, ...section } = exist;
  return {
    pathname,
    ...section,
    columnVisibility: {
      ...visibility,
    },
    columnControl,
  };
}
