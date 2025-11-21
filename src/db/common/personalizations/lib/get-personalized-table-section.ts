import type { PersonalizationDataset } from '@workspace/db/schema';
import type { Personalization, PersonalizedSection } from '@workspace/db/validation';
import { DEFAULT_PAGE_SIZE } from '@workspace/utils/constants';
import isEmpty from 'lodash/isEmpty';

interface GetPersonalizedTableSection extends Personalization {
  sections: PersonalizedSection[];
}

export function getPersonalizedTableSection({
  personalization,
  dataset,
  pathname,
}: {
  personalization?: GetPersonalizedTableSection;
  dataset: PersonalizationDataset;
  pathname: string;
}) {
  if (isEmpty(dataset)) {
    return { pathname, dataset, limit: DEFAULT_PAGE_SIZE };
  }

  const exist = personalization?.sections?.find((sc) => sc.dataset === dataset);

  if (!exist) {
    return {
      pathname,
      dataset,
      limit: DEFAULT_PAGE_SIZE,
    };
  }

  const { visibility, ...section } = exist;
  return {
    pathname,
    ...section,
    columnVisibility: {
      ...visibility,
    },
  };
}

export type PersonalizationPropsType = ReturnType<typeof getPersonalizedTableSection>;
