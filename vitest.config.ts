import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', 'e2e/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/xss-protection.ts',
        'src/lib/validation.ts',
        'src/lib/rate-limit.ts',
        'src/lib/auth-lockout.ts',
        'src/lib/image-validation.ts',
        'src/lib/date-utils.ts',
        'src/lib/pagination.ts',
        'src/lib/errors.ts',
        'src/lib/resource-access.ts',
        'src/lib/security-headers.ts',
        'src/lib/settings.ts',
        'src/app/api/health/live/route.ts',
        'src/app/api/health/ready/route.ts',
        'src/app/api/health/route.ts',
        'src/app/api/auth/register/route.ts',
        'src/app/api/auth/check-lockout/route.ts',
        'src/app/api/upload/image/route.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
