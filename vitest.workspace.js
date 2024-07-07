import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/compiler/vitest.config.ts',
  './packages/e2e-test/vitest.config.ts',
])
