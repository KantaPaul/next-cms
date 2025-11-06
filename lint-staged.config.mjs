import path from 'path';

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(' --file ')}`;

const config = {
  // Handle JS/TS files
  '*.{js,jsx,ts,tsx}': [buildEslintCommand, 'prettier --ignore-unknown --write'],

  // Handle CSS, JSON, MD, etc.
  '*.{css,scss,json,md,mdx,html,yml,yaml}': ['prettier --ignore-unknown --write'],

  // Handle package.json
  'package.json': ['prettier --ignore-unknown --write'],
};

export default config;
