// ESLint 8 config for packages/web (React + TypeScript + Vite)
// Plugins are hoisted from the root node_modules by pnpm.
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Warn, not error: adding deps can cause infinite loops / extra fetches.
    'react-hooks/exhaustive-deps': 'warn',
    // Standard Vite React-refresh guard (warn only).
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // `any` is unavoidable in a few catch blocks and Supabase callbacks.
    '@typescript-eslint/no-explicit-any': 'warn',
    // Prefer over the base rule for TS files.
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true,
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
    }],
  },
  ignorePatterns: ['dist/', 'build/', 'public/', '*.gen.ts', 'vite.config.ts'],
};
