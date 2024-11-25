import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  './packages/compiler/vitest.config.mts',
  './packages/e2e-test/vitest.config.mts',
])
