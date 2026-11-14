import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TARGET_DIRS = ['src/app/(admin)', 'src/components', 'src/builder/blocks'];

const PHYSICAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bml-(\d+|px|auto|\[[^\]]+\])/g, 'ms-$1'],
  [/\bmr-(\d+|px|auto|\[[^\]]+\])/g, 'me-$1'],
  [/\bpl-(\d+|px|\[[^\]]+\])/g, 'ps-$1'],
  [/\bpr-(\d+|px|\[[^\]]+\])/g, 'pe-$1'],
  [/\b-ml-(\d+|px|\[[^\]]+\])/g, '-ms-$1'],
  [/\b-mr-(\d+|px|\[[^\]]+\])/g, '-me-$1'],
  [/\btext-left\b/g, 'text-start'],
  [/\btext-right\b/g, 'text-end'],
  [/\bborder-l(-[0-9a-zA-Z[\]]+)?\b/g, 'border-s$1'],
  [/\bborder-r(-[0-9a-zA-Z[\]]+)?\b/g, 'border-e$1'],
  [/\brounded-l(-[0-9a-zA-Z[\]]+)?\b/g, 'rounded-s$1'],
  [/\brounded-r(-[0-9a-zA-Z[\]]+)?\b/g, 'rounded-e$1'],
  [/\bleft-(\d+|px|auto|1\/2|full|0|\[[^\]]+\])/g, 'start-$1'],
  [/\bright-(\d+|px|auto|1\/2|full|0|\[[^\]]+\])/g, 'end-$1'],
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const dryRun = process.argv.includes('--dry');
let changedFiles = 0;

for (const dir of TARGET_DIRS) {
  const absDir = path.resolve(process.cwd(), dir);
  for (const file of walk(absDir)) {
    const orig = readFileSync(file, 'utf8');
    let next = orig;
    for (const [re, rep] of PHYSICAL_REPLACEMENTS) {
      next = next.replace(re, rep);
    }
    if (next !== orig) {
      changedFiles++;
      if (!dryRun) {
        writeFileSync(file, next);
      }
      console.log(`${dryRun ? '[dry] ' : ''}${path.relative(process.cwd(), file)}`);
    }
  }
}

console.log(`${dryRun ? 'Would update' : 'Updated'} ${changedFiles} file(s).`);
