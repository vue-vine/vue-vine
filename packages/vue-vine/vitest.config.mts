import { defineConfig } from 'vitest/config'

const vitestConfig: ReturnType<typeof defineConfig> = defineConfig({
  test: {
    include: ['./tests/**/*.spec.ts'],
    environment: 'jsdom',
  },
})
export default vitestConfig
