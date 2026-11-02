import {
  QueryFilterClient,
  type QueryFilterClientProps,
} from './query-filters-client';
import { Section, type SectionSettings } from './section';

export type QueryFilterProps = QueryFilterClientProps & {
  section?: SectionSettings;
};

export function QueryFilter({ section, editing, ...props }: QueryFilterProps) {
  return (
    <Section section={section} editing={editing}>
      <QueryFilterClient {...props} editing={editing} />
    </Section>
  );
}
