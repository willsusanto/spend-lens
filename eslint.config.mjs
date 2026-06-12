import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const config = [
  {
    ignores: [
      '.next/*',
      'node_modules/*',
      'public/mockServiceWorker.js',
      'generators/*',
      '**/*.css',
    ],
  },
  ...nextVitals,
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/testing/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        vi: 'readonly',
      },
    },
  },
  ...compat.config({
    env: {
      node: true,
      es6: true,
    },
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    extends: ['eslint:recommended'],
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx'],
        parser: '@typescript-eslint/parser',
        settings: {
          react: { version: 'detect' },
          'import/resolver': {
            typescript: {},
          },
        },
        env: {
          browser: true,
          node: true,
          es6: true,
        },
        extends: [
          'eslint:recommended',
          'plugin:prettier/recommended',
          'plugin:testing-library/react',
          'plugin:jest-dom/recommended',
          'plugin:tailwindcss/recommended',
          'plugin:vitest/legacy-recommended',
        ],
        rules: {
          '@next/next/no-img-element': 'off',
          'import/no-restricted-paths': [
            'error',
            {
              zones: [
                {
                  target: './src/features/finance',
                  from: './src/features',
                  except: ['./finance'],
                },
                {
                  target: './src/features/comments',
                  from: './src/features',
                  except: ['./comments'],
                },
                {
                  target: './src/features/discussions',
                  from: './src/features',
                  except: ['./discussions'],
                },
                {
                  target: './src/features/teams',
                  from: './src/features',
                  except: ['./teams'],
                },
                {
                  target: './src/features/users',
                  from: './src/features',
                  except: ['./users'],
                },
                {
                  target: './src/features',
                  from: './src/app',
                },
                {
                  target: [
                    './src/components',
                    './src/hooks',
                    './src/lib',
                    './src/types',
                    './src/utils',
                  ],
                  from: ['./src/features', './src/app'],
                },
              ],
            },
          ],
          'import/no-cycle': 'error',
          'linebreak-style': 'off',
          'react/prop-types': 'off',
          'import/order': [
            'error',
            {
              groups: [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index',
                'object',
              ],
              'newlines-between': 'always',
              alphabetize: { order: 'asc', caseInsensitive: true },
            },
          ],
          'import/default': 'off',
          'import/no-named-as-default-member': 'off',
          'import/no-named-as-default': 'off',
          'react/react-in-jsx-scope': 'off',
          'jsx-a11y/anchor-is-valid': 'off',
          'no-undef': 'off',
          'no-unused-vars': 'off',
          '@typescript-eslint/no-unused-vars': ['error'],
          '@typescript-eslint/explicit-function-return-type': ['off'],
          '@typescript-eslint/explicit-module-boundary-types': ['off'],
          '@typescript-eslint/no-empty-function': ['off'],
          '@typescript-eslint/no-explicit-any': ['off'],
          'react-hooks/set-state-in-effect': 'off',
          'prettier/prettier': [
            'error',
            { endOfLine: 'auto' },
            { usePrettierrc: true },
          ],
        },
      },
      {
        plugins: ['check-file'],
        files: ['src/**/*'],
        rules: {
          'check-file/filename-naming-convention': [
            'error',
            {
              '**/*.{ts,tsx}': 'KEBAB_CASE',
            },
            {
              ignoreMiddleExtensions: true,
            },
          ],
          'check-file/folder-naming-convention': [
            'error',
            {
              '!(src/app)/**/*': 'KEBAB_CASE',
              '!(**/__tests__)/**/*': 'KEBAB_CASE',
            },
          ],
        },
      },
    ],
  }),
];

export default config;
