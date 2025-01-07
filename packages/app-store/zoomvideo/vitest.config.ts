import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./lib/__tests__/test-setup.ts'],
    include: ['./lib/__tests__/**/*.test.ts'],
  },
});
