'use client';

import type { ComponentType } from 'react';
import { Section, DEFAULT_SECTION, type SectionSettings } from '../blocks/section';

export type ExampleProps = {
  heading?: string;
  body?: string;
  section?: SectionSettings;
  editing?: boolean;
};

function ExampleBlock({
  heading,
  body,
  section,
  editing,
}: ExampleProps) {
  return (
    <Section section={section} editing={editing}>
      {heading ? (
        <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
      ) : null}
      {body ? <p className="s-muted mt-2">{body}</p> : null}
    </Section>
  );
}

/**
 * Local plugin block used to exercise the loader. Renders a heading and a text
 * line. Delete both references to disable it; adding a block means adding a file
 * under src/builder/custom/ and one line in src/builder/custom/index.ts.
 */
export const Example: ComponentType<Record<string, unknown>> =
  ExampleBlock as unknown as ComponentType<Record<string, unknown>>;
