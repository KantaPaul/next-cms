import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const isDevEnv = process.env.NODE_ENV === 'development';

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript', 'prettier'],
    plugins: ['import'],
    rules: {
      // ✅ TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-extra-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',

      // ✅ JavaScript/React rules
      'no-var': 'warn',
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-console': 'off',
      'no-debugger': 'warn',
      'no-empty': 'warn',
      'no-empty-pattern': 'off',
      'no-extra-semi': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-unreachable': 'warn',
      'no-unused-expressions': 'off',
      'no-unused-labels': 'warn',
      'prefer-const': 'warn',

      'react/no-unknown-property': 'warn',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-key': 'warn',
      'react/jsx-no-duplicate-props': 'warn',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/require-render-return': 'warn',
      'react/style-prop-object': 'warn',

      // ✅ Formatting
      'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],

      ...(isDevEnv && {
        // ✅ Circular Dependency Detection
        'import/no-cycle': ['warn', { maxDepth: Infinity, ignoreExternal: true }],

        // ✅ Optional: Spacing after imports
        'import/newline-after-import': ['warn', { count: 1 }],
      }),
    },
    globals: {
      React: 'readonly',
      FIX_ME: 'readonly',
    },
  }),

  // ✅ Rule for schema import restriction
  {
    files: ['**/*.schema.ts', 'src/db/schema/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@/db/schema',
              message:
                'To prevent circular dependency issues, import schema types directly from their specific module files (e.g., "@/db/schema/users") rather than from "@/db/schema".',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
