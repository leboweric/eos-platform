import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/teamTransfer-todo-routing.test.js']
  }
});
