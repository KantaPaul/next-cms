import { writeFileSync } from 'node:fs';
import * as LucideIcons from 'lucide-react';

const iconNames = Object.keys(LucideIcons)
  .filter(name => /^[A-Z]/.test(name) && name !== 'Icon')
  .sort();

const output = `import {\n${iconNames
  .map(name => `  ${name},`)
  .join('\n')}\n} from "lucide-react";\n`;

writeFileSync('lucide-all-icons.ts', output);

console.log(`Generated ${iconNames.length} icon imports.`);
