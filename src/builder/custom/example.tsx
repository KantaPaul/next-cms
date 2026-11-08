'use client';

import type { ComponentType } from 'react';
import { el, type WithSection } from '../blocks/element';
import { Section } from '../blocks/section';

export type ExampleProps = WithSection & {
  heading?: string;
  body?: string;
};

function ExampleBlock(p: ExampleProps) {
  const headingEl = el(p, 'heading', 'text-2xl font-bold tracking-tight');
  const bodyEl = el(p, 'body', 's-muted mt-2');

  return (
    <Section section={p.section} editing={p.editing}>
      {p.heading ? (
        <h2 className={headingEl.className} style={headingEl.style}>
          {p.heading}
        </h2>
      ) : null}
      {p.body ? (
        <p className={bodyEl.className} style={bodyEl.style}>
          {p.body}
        </p>
      ) : null}
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
