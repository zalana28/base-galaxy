// ESLint flat config for Base Galaxy (React + Vite).
import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // Global ignores (must be a standalone config object to apply globally).
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Browser-game code commonly guards against missing hosts (Farcaster SDK,
      // injected wallets, etc.) with try/catch. Empty catches here are intentional.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Lightweight console diagnostics are intentional in this game.
      'no-console': 'off',
      // Underscore-prefixed unused vars are fine.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Not using prop-types library — types are obvious from usage.
      'react/prop-types': 'off',
    },
  },
];
