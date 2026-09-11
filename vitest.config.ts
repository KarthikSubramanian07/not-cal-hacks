import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@': r('./src'),
            '@shared': r('./shared'),
            '@server': r('./server'),
          },
        },
        test: {
          name: 'unit',
          environment: 'happy-dom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      './vitest.workers.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}', 'shared/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
