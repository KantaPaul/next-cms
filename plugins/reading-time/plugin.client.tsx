/**
 * Example plugin (client entry): Reading Time
 *
 * Use this file as a template for client-side extensions:
 * - `blocks`: namespaced builder blocks (`reading-time/<BlockName>`)
 * - `fields`: custom inspector fields
 * - `adminPages`: React pages mounted at /dashboard/plugins/reading-time/<slug>
 */

import { defineBlock } from '@nextcms/builder-core';
import { defineClientPlugin } from '@nextcms/plugin-sdk/client';
import { z } from 'zod';

const ReadingTimeSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(240).default(3),
  label: z.string().default('Estimated reading time'),
  showIcon: z.boolean().default(true),
});

type ReadingTimeProps = z.infer<typeof ReadingTimeSchema> & {
  editing?: boolean;
};

function ReadingTimeBadge({ minutes, label, showIcon }: ReadingTimeProps) {
  const safeMinutes = Number.isFinite(minutes) && minutes >= 1 ? minutes : 3;
  return (
    <div
      data-plugin="reading-time"
      data-reading-time={safeMinutes}
      className="my-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-sm font-medium text-foreground"
    >
      {showIcon !== false && <span aria-hidden="true">⏱</span>}
      <span>
        {label || 'Estimated reading time'}: {safeMinutes} min read
      </span>
    </div>
  );
}

/** Namespaced block (`reading-time/ReadingTime`) so it never collides with core blocks. */
export const ReadingTimeBlock = defineBlock({
  type: 'reading-time/ReadingTime',
  label: 'Reading time',
  category: 'content',
  schema: ReadingTimeSchema,
  defaults: {
    minutes: 3,
    label: 'Estimated reading time',
    showIcon: true,
  },
  fields: {
    minutes: {
      label: 'Minutes',
      type: 'number',
      tab: 'content',
      section: 'Reading time',
    },
    label: {
      label: 'Label',
      type: 'text',
      tab: 'content',
      section: 'Reading time',
    },
    showIcon: {
      label: 'Show clock icon',
      type: 'toggle',
      tab: 'content',
      section: 'Reading time',
    },
  },
  render: ReadingTimeBadge,
});

export default defineClientPlugin({
  id: 'reading-time',
  blocks: [ReadingTimeBlock],
});
