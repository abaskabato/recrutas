import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'client/src/__tests__/**',
      'test/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
      '*.mjs',
      '*.cjs',
    ],
  },
  // Only lint TypeScript source files
  {
    files: ['server/**/*.ts', 'client/src/**/*.ts', 'client/src/**/*.tsx', 'shared/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Errors — real bugs
      'no-debugger': 'error',
      'no-async-promise-executor': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',

      // Warnings — code quality issues to fix incrementally
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-unused-vars': 'off',           // delegated to @typescript-eslint/no-unused-vars
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'always'],
      'no-console': 'off',

      // Off — too noisy in current codebase, revisit later
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'curly': 'off',
    },
  },
);
