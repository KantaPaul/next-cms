// Preload for Node scripts and tests that import app code outside Next.js:
// `tsx --import ./scripts/server-only-stub.mjs <file>`.
// `server-only` exists to fail client bundles, and CSS imports are handled by
// the Next.js bundler; in plain Node neither has anything to do, so both
// resolve to an empty module.
import { registerHooks } from 'node:module';

const EMPTY = new URL('./empty-module.cjs', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only' || specifier.endsWith('.css')) {
      return { url: EMPTY, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
