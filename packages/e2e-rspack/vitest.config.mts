import process from 'node:process'
import { defineConfig } from 'vitest/config'

const timeout = process.env.CI ? 50000 : 30000

const config: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    include: ['./tests/**/*.spec.[tj]s'],
    testTimeout: timeout,
    hookTimeout: timeout,
    reporters: [['default', { summary: false }]],
    sequence: {
      shuffle: false,
      hooks: 'list',
    },
  },
})

export default config
