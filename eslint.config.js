// ESLint flat config for Base Star Raider (vanilla JS, browser globals).
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    rules: {
      // Browser-game code commonly guards against missing hosts (Farcaster SDK,
      // injected wallets, etc.) with try/catch. Empty catches here are intentional.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Lightweight console diagnostics are intentional in this game.
      'no-console': 'off',
      // Underscore-prefixed unused vars are fine.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
    ignores: ['node_modules/**', 'dist/**'],
  },
];
