import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

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
        'import/no-cycle': [
          'warn',
          { maxDepth: Infinity, ignoreExternal: true },
        ],

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

  // ✅ Admin links keep the locale prefix: no raw /dashboard strings in navigation calls
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/lib/locale/admin-href.ts', 'src/**/__tests__/**', 'src/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(push|replace)$/] > Literal[value=/^\\/dashboard/]",
          message:
            'Use adminHref() or useAdminHref() with PAGES.DASHBOARD.* instead of a raw /dashboard string.',
        },
        {
          selector:
            "CallExpression[callee.name='redirect'] > Literal[value=/^\\/dashboard/]",
          message:
            'Use adminRedirect() or adminHref() instead of a raw /dashboard string.',
        },
      ],
    },
  },

  // ✅ Translated admin areas: no hard-coded UI text. Add each folder/file
  // here once its strings are moved to src/i18n/messages (Phase 3).
  {
    files: [
      'src/components/atoms/**/*.tsx',
      'src/components/ui/**/*.tsx',
      'src/components/molecules/**/*.tsx',
      'src/components/organisms/header/**/*.tsx',
      'src/components/dashboard/lang-switcher.tsx',
      'src/components/dashboard/site-switcher.tsx',
      'src/app/(admin)/dashboard/(shell)/pages/**/*.tsx',
      'src/app/(admin)/dashboard/(shell)/posts/**/*.tsx',
      'src/app/(admin)/dashboard/(shell)/collections/**/*.tsx',
    ],
    ignores: [
      'src/components/**/__tests__/**',
      // Not imported anywhere (older entry UI): delete or translate.
      'src/app/(admin)/dashboard/(shell)/collections/components/entry-status-card.tsx',
      'src/app/(admin)/dashboard/(shell)/collections/components/entry-list.tsx',
      'src/app/(admin)/dashboard/(shell)/collections/components/create-entry-form.tsx',
      'src/app/(admin)/dashboard/(shell)/collections/components/edit-entry-form.tsx',
    ],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: false,
          ignoreProps: true,
          // Punctuation, required-field asterisks and skeleton/page digits.
          allowedStrings: ['·', '—', '-', '/', '|', ':', '…', '*', '+', '1', '2', '3'],
        },
      ],
    },
  },
];

export default eslintConfig;
