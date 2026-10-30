// Size budget for the compiled editor CSS (B15 E1 step 6, E9). Fails when
// dist/editor-ui.css grows past the limit; run build:css first.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const LIMIT_GZIP_KB = 16;

const file = join(
  dirname(fileURLToPath(import.meta.url)),
  '../dist/editor-ui.css'
);
const css = await readFile(file);
const gzipKb = gzipSync(css).length / 1024;
const line = `editor-ui.css: ${(css.length / 1024).toFixed(1)} kB, ${gzipKb.toFixed(1)} kB gzip (limit ${LIMIT_GZIP_KB} kB gzip)`;
if (gzipKb > LIMIT_GZIP_KB) {
  console.error(`${line} — over budget`);
  process.exit(1);
}
console.log(line);
