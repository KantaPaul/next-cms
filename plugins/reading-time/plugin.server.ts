/**
 * Example plugin (server entry): Reading Time
 *
 * Use this file as a template when creating your own server plugin.
 * Server-only code (hooks, filters, settings, routes, cron) lives here
 * and is never bundled into the browser.
 */

import { definePlugin } from '@nextcms/plugin-sdk';
import { z } from 'zod';
import { estimateReadingTimeMinutes } from './src/estimate';

export default definePlugin({
  // 1. Identity & compatibility
  id: 'reading-time',
  name: 'Reading Time',
  version: '1.0.0',
  description:
    'Adds an estimated reading time block, annotates rendered HTML with data-reading-time, and logs publishes.',
  requires: '>=0.1.0',

  // 2. Settings schema + field metadata rendered automatically in Dashboard -> Plugins
  settings: {
    schema: z.object({
      wordsPerMinute: z.coerce.number().int().min(50).max(1000).default(200),
      prefixText: z.string().max(80).default('Estimated reading time:'),
    }),
    fields: {
      wordsPerMinute: {
        label: 'Reading speed (words per minute)',
        type: 'number',
        defaultValue: 200,
        description: 'Used to estimate minutes from word count.',
      },
      prefixText: {
        label: 'Label prefix',
        type: 'text',
        defaultValue: 'Estimated reading time:',
        placeholder: 'Estimated reading time:',
      },
    },
  },

  // 3. Action hooks: run asynchronously after the response via Next's `after()`
  hooks: {
    'content.published': async (event, ctx) => {
      ctx.logger.info(
        `Published ${event.type} "${event.title ?? event.id}" (slug: ${event.slug ?? 'none'})`
      );
      await ctx.kv.set(`last-published:${event.type}:${event.id}`, {
        at: new Date().toISOString(),
        slug: event.slug ?? null,
      });
    },
  },

  // 4. Filters: transform values in priority order
  filters: {
    'content.html': {
      priority: 10,
      run: (html, ctx) => {
        if (!html.trim()) return html;
        const wpm =
          typeof ctx.settings.wordsPerMinute === 'number'
            ? ctx.settings.wordsPerMinute
            : 200;
        const { minutes } = estimateReadingTimeMinutes(html, wpm);
        return `<div data-reading-time="${minutes}">${html}</div>`;
      },
    },
  },

  // 5. Plugin API routes mounted at /api/plugins/reading-time/...
  routes: [
    {
      method: 'GET',
      path: '/estimate',
      auth: 'public',
      handler: req => {
        const words = Number(req.query.get('words') ?? '400');
        const safeWords = Number.isFinite(words) && words >= 0 ? words : 0;
        const wpm = 200;
        const minutes = Math.max(1, Math.ceil(safeWords / wpm));
        return Response.json({ words: safeWords, minutes, label: `${minutes} min read` });
      },
    },
  ],
});
