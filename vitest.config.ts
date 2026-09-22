import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { 'react-native': 'react-native-web' } },
  test: {
    environment: 'node',
    include: [
      'src/core/**/*.test.ts',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
  },
});
