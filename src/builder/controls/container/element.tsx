'use client';

import { useId } from 'react';
import { UrlField } from '../../fields/client-fields';
import {
  CONTAINER_TAGS,
  type ContainerSettings,
  type ContainerTag,
  LANDMARK_TAGS,
} from '../../style';
import { ControlLabel, Notice, SelectInput } from '../primitives';

const TAG_LABELS: Record<ContainerTag, string> = {
  div: 'Div',
  section: 'Section',
  article: 'Article',
  header: 'Header',
  footer: 'Footer',
  aside: 'Aside',
  nav: 'Nav',
  main: 'Main',
};

export function ContainerElementControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings) => void;
}) {
  const c = value ?? {};
  const id = useId();
  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...c, ...patch });

  return (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <SelectInput<ContainerTag>
          label="HTML tag"
          value={c.tag ?? 'div'}
          options={CONTAINER_TAGS.map(v => ({
            value: v,
            label: TAG_LABELS[v],
          }))}
          onChange={tag => set({ tag })}
        />
        <Notice>
          Landmark tags ({LANDMARK_TAGS.join(', ')}) should be unique per page.
        </Notice>
      </div>

      <div className="space-y-1.5">
        <ControlLabel label="Whole-container link" htmlFor={id}>
          <span className="text-[10px] text-muted-foreground">
            Wraps container
          </span>
        </ControlLabel>
        <UrlField
          name={id}
          id={id}
          value={c.link}
          field={{ label: '' }}
          onChange={next => set({ link: next || undefined })}
        />
      </div>
    </div>
  );
}
