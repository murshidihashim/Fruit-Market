import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json';

// `npm run build` -> dist/ for the Android app. `npm run build:single` -> one HTML file for web previews.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', target: 'es2019' },
}));
