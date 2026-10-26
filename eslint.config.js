// Lint for correctness, not style (TypeScript already enforces types and unused code).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dist-single', 'android', 'node_modules', 'coverage', '.wrangler'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      // TypeScript's own unused checks (tsconfig) already cover these.
      '@typescript-eslint/no-unused-vars': 'off',
      // Deliberate in a few places (CSS custom properties, test doubles).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**/*.cjs', 'scripts/**/*.mjs', 'docs/**/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { files: ['scripts/**/*.cjs', 'docs/**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
);
