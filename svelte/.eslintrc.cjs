module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:svelte/recommended',
    'plugin:svelte/prettier',
  ],
  root: true,
  env: { node: true },
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    extraFileExtensions: ['.svelte'],
  },
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
      env: { browser: true },
    },
  ],
  ignorePatterns: ['.eslintrc.cjs', 'vite.config.js'],
  rules: {
    'no-constant-binary-expression': 'warn',
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/consistent-type-exports': 'warn',
    'import/consistent-type-specifier-style': ['warn', 'prefer-inline'],
    'import/no-duplicates': ['warn', { 'prefer-inline': true }],
    'a11y-click-events-have-key-events': 'off',
    'a11y-invalid-attribute': 'off',
    'svelte/no-unused-svelte-ignore': 'off',
  },
  settings: {
    'import/parsers': { '@typescript-eslint/parser': ['.ts'] },
    'import/extensions': ['.ts'],
    'import/resolver': { typescript: { project: './tsconfig.json' } },
    'svelte3/ignore-warnings': (warning) => {
      return warning.code === 'a11y-click-events-have-key-events';
    },
  },
};
