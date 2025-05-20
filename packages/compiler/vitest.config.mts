import { defineConfig } from 'vitest/config'

const vitestConfig: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
    },
  },
})
export default vitestConfig
