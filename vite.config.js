import { defineConfig } from 'vite';

// Library build. The source in src/ already runs in the browser as-is; this
// produces single-file bundles for people who prefer one file:
//   dist/chronokit.js      ES module      import { Calendar } from './chronokit.js'
//   dist/chronokit.umd.js  <script> tag   window.ChronoKit.Calendar
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ChronoKit',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'chronokit.js' : 'chronokit.umd.js'),
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
});
