import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Each test file runs in its own forked process. SQLite in-memory databases
    // and the rate limiter are module-level singletons, so file-level isolation
    // is required for deterministic results.
    pool: 'forks',
    globals: false,
    reporters: ['verbose'],
  },
});