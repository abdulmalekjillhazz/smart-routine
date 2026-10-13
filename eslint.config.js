import js from '@eslint/js';
import globals from 'globals';

// Flat config (ESLint 9). Lints the server, the client's JavaScript, and shared code.
export default [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/coverage/**', 'ml/**', 'docs/**'],
  },
  js.configs.recommended,
  {
    files: ['server/**/*.{js,mjs}', 'client/**/*.{js,mjs}', 'shared/**/*.{js,mjs}', '*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, fetch: 'readonly', Response: 'readonly', Request: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['client/**/*.{js,jsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['client/public/sw.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: { 'no-undef': 'off' },
  },
];
