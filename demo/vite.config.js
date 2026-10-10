import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Only used to bundle the demo into one HTML file for sharing.
// To run the demo you don't need this: serve the project folder with any
// static server and open /demo/ (see README).
export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  plugins: [viteSingleFile()],
  build: { outDir: '../demo-dist', emptyOutDir: true },
});
