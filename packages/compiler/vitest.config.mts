import { defineConfig } from 'vitest/config'

const vitestConfig: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    coverage: {
      provider: 'v8',
    },
  },
})
export default vitestConfig
