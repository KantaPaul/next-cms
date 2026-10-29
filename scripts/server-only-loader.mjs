// ESM half of server-only-stub.mjs for Node versions without module.registerHooks.
const EMPTY_URL = new URL('./empty-module.cjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only' || specifier.endsWith('.css')) {
    return { url: EMPTY_URL, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
