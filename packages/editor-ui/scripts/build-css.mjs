// Compiles src/editor-ui.css into dist/editor-ui.css with Tailwind v4
// (B15 E1, gap G1). Uses the workspace's @tailwindcss/postcss so the
// package needs no CLI of its own; pass --watch to rebuild on changes.

import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = join(root, 'src/editor-ui.css');
const tokens = join(root, 'src/tokens.css');
const motion = join(root, 'src/motion.css');
const output = join(root, 'dist/editor-ui.css');

// The app pins Tailwind 3 at the workspace root, so a bare 'tailwindcss/…'
// import would resolve to v3. Point it at the v4 copy @tailwindcss/postcss uses.
const require = createRequire(import.meta.url);
const tailwindPostcssDir = dirname(require.resolve('@tailwindcss/postcss'));
const tailwindV4 = dirname(
  require.resolve('tailwindcss/package.json', { paths: [tailwindPostcssDir] })
);
const { transform } = require(
  require.resolve('lightningcss', {
    paths: [
      dirname(
        require.resolve('@tailwindcss/node', { paths: [tailwindPostcssDir] })
      ),
    ],
  })
);

// Utilities only apply inside editor chrome. `:where()` adds no specificity.
const SCOPE = ':where(.ne-editor-root, .ne-editor-root *, .ne-ui, .ne-ui *)';

function scopeSelector(selector) {
  // Keep pseudo-elements last: `.a::before` -> `.a:where(...)::before`.
  const match = selector.match(
    /^(.*?)(::?(?:before|after|placeholder|backdrop|marker|selection|file-selector-button)\b.*)?$/
  );
  return `${match[1]}${SCOPE}${match[2] ?? ''}`;
}

// v4 `space-y-*`: `:where(.space-y-3 > :not(:last-child))`, margin on the end.
const SPACE_Y = /^:where\((\.space-y-[^\s>]+)\s*>\s*:not\(:last-child\)\)$/;

// The app's Tailwind 3 utilities still match editor elements with the same
// class names. Where the two versions use different mechanisms they stack
// instead of overriding, so make the v4 rule cancel the v3 one:
// - translate/rotate/scale: v4 uses those properties, v3 uses `transform`;
// - space-y: v3 puts margin-top on later siblings with a (0,3,0) selector,
//   so v4's rule is rewritten to the same shape and the same side.
function reconcileWithTailwind3(rule) {
  const space = rule.selector.match(SPACE_Y);
  if (space) {
    rule.selector = `${space[1]}${SCOPE} > :not([hidden]) ~ :not([hidden])`;
    const start = rule.nodes.find(d => d.prop === 'margin-block-start');
    const end = rule.nodes.find(d => d.prop === 'margin-block-end');
    if (start && end) [start.value, end.value] = [end.value, start.value];
    return true;
  }
  const props = new Set(
    rule.nodes.filter(d => d.type === 'decl').map(d => d.prop)
  );
  if (
    (props.has('translate') || props.has('rotate') || props.has('scale')) &&
    !props.has('transform')
  ) {
    // Prepend: lightningcss drops individual transforms declared before `transform`.
    rule.prepend({ prop: 'transform', value: 'none' });
  }
  return false;
}

const scopeUtilities = {
  postcssPlugin: 'editor-ui-scope',
  Rule(rule) {
    if (rule.__scoped) return;
    rule.__scoped = true;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (
        parent.type === 'atrule' &&
        /keyframes|property|layer/.test(parent.name)
      )
        return;
    }
    if (reconcileWithTailwind3(rule)) return;
    if (!rule.selector.startsWith('.')) return;
    rule.selectors = rule.selectors.map(scopeSelector);
  },
};

async function build() {
  const started = Date.now();
  const css = (await readFile(input, 'utf8')).replaceAll(
    "'tailwindcss/",
    `'${tailwindV4}/`
  );
  const compiled = await postcss([
    tailwind({ base: root, optimize: false }),
  ]).process(css, {
    from: input,
    to: output,
  });
  const scoped = await postcss([scopeUtilities]).process(compiled.css, {
    from: undefined,
  });
  const tokenCss = await readFile(tokens, 'utf8');
  const motionCss = await readFile(motion, 'utf8');
  const { code } = transform({
    filename: 'editor-ui.css',
    code: Buffer.from(`${scoped.css}\n${tokenCss}\n${motionCss}`),
    minify: true,
  });
  const result = { css: code.toString() };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, result.css);
  console.log(
    `editor-ui: wrote dist/editor-ui.css (${(result.css.length / 1024).toFixed(1)} kB) in ${Date.now() - started} ms`
  );
}

await build();

if (process.argv.includes('--watch')) {
  let timer;
  watch(join(root, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(error => console.error(error)), 100);
  });
  console.log('editor-ui: watching src/');
}
