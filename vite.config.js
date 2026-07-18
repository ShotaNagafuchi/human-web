import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'HumanWeb',
      formats: ['iife'],
      fileName: () => 'human-web.js',
    },
    minify: 'esbuild',
  },
});
