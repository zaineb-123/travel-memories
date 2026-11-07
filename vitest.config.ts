import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      BCRYPT_ROUNDS: '4',
      UPLOAD_DIR: 'tmp-test-uploads',
    },
  },
});
