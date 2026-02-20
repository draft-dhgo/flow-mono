import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'path';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, './src/common'),
      '@workflow-runtime': path.resolve(__dirname, './src/workflow-runtime'),
      '@workflow': path.resolve(__dirname, './src/workflow'),
      '@git': path.resolve(__dirname, './src/git'),
      '@mcp': path.resolve(__dirname, './src/mcp'),
      '@agent': path.resolve(__dirname, './src/agent'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
