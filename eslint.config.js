// Lint for correctness, not style (TypeScript already enforces types and unused code).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // docs/studio/review-17 holds the helper scripts of a finished study (reference only); .claude holds helper work folders.
  { ignores: ['dist', 'dist-single', 'android', 'node_modules', 'coverage', '.wrangler', '.claude', 'docs/studio/review-17'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // REP-140 A-02: every hook lists what it reads. Where leaving one out is on purpose (a ref stands in for state, or
      // an effect runs on one change only), the line says so in an eslint-disable comment with its reason.
      'react-hooks/exhaustive-deps': 'error',
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
  // PLAN-130: helper T2 fixes the hook dependencies of these files in its own branch; until that is merged they only
  // warn. Remove this block when it is.
  {
    files: ['src/ui/App.tsx', 'src/ui/Online.tsx', 'src/ui/Opening.tsx', 'src/ui/Sprint.tsx', 'src/ui/HomeCards.tsx', 'src/ui/DailyIntro.tsx'],
    rules: { 'react-hooks/exhaustive-deps': 'warn' },
  },
  {
    files: ['scripts/**/*.cjs', 'scripts/**/*.mjs', 'docs/**/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { files: ['scripts/**/*.cjs', 'docs/**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
);
