import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { UI_LOCALES } from '../src/i18n/config';

const MESSAGES_ROOT = path.resolve(process.cwd(), 'src/i18n/messages');
const SOURCE_LOCALE = 'en';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function main() {
  const sourceDir = path.join(MESSAGES_ROOT, SOURCE_LOCALE);
  const namespaces = readdirSync(sourceDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  let errors = 0;

  for (const ns of namespaces) {
    const sourceJson = JSON.parse(readFileSync(path.join(sourceDir, ns), 'utf8'));
    const sourceKeys = new Set(flattenKeys(sourceJson));

    for (const locale of UI_LOCALES) {
      if (locale === SOURCE_LOCALE) continue;
      const targetFile = path.join(MESSAGES_ROOT, locale, ns);
      if (!existsSync(targetFile)) {
        console.error(`[missing file] ${locale}/${ns}`);
        errors++;
        continue;
      }

      const targetJson = JSON.parse(readFileSync(targetFile, 'utf8'));
      const targetKeys = new Set(flattenKeys(targetJson));

      for (const k of sourceKeys) {
        if (!targetKeys.has(k)) {
          console.error(`[missing key] ${locale}/${ns}: ${k}`);
          errors++;
        }
      }
      for (const k of targetKeys) {
        if (!sourceKeys.has(k)) {
          console.error(`[extra key] ${locale}/${ns}: ${k}`);
          errors++;
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\ni18n:check failed with ${errors} issue(s).`);
    process.exit(1);
  }

  console.log(
    `i18n:check passed: ${namespaces.length} namespaces verified across ${UI_LOCALES.join(', ')}.`
  );
}

main();
