// Preload for Node scripts and tests that import app code outside Next.js:
// `tsx --import ./scripts/server-only-stub.mjs <file>`.
// `server-only` exists to fail client bundles, and CSS imports are handled by
// the Next.js bundler; in plain Node neither has anything to do, so both
// resolve to an empty module.
import module from 'node:module';
import { fileURLToPath } from 'node:url';

const EMPTY_URL = new URL('./empty-module.cjs', import.meta.url).href;
const stubbed = specifier => specifier === 'server-only' || specifier.endsWith('.css');

if (typeof module.registerHooks === 'function') {
  // Node 22.15+: one synchronous hook covers both import and require.
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (stubbed(specifier)) return { url: EMPTY_URL, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
} else {
  // Older Node: patch CommonJS resolution (tsx runs app files as CommonJS)
  // and register an ESM loader for `import`.
  const emptyPath = fileURLToPath(EMPTY_URL);
  const resolveFilename = module._resolveFilename;
  module._resolveFilename = function (request, ...rest) {
    return stubbed(request) ? emptyPath : resolveFilename.call(this, request, ...rest);
  };
  module.register(new URL('./server-only-loader.mjs', import.meta.url));
}
