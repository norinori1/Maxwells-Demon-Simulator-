import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  esbuild: {
    legalComments: 'none',
    drop: ['debugger'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        compact: true,
      },
    },
  },
});
