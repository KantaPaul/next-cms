/**
 * Active build-time plugins for this Next CMS installation.
 *
 * Add local folder paths (e.g. `'./plugins/my-plugin'`) or npm package names
 * (e.g. `'nextcms-plugin-analytics'`), then run `pnpm plugins:sync` (or build/dev).
 */
const plugins: string[] = [
  './plugins/mailchimp',
  './plugins/reading-time',
];

export default plugins;
