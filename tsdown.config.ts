import { join } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'tsdown'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  workspace: {
    include: ['packages/*'],
    exclude: ['packages/docs', 'packages/e2e-test', 'packages/nuxt-module', 'packages/playground'],
  },
  dts: { eager: true },
  tsconfig: join(import.meta.dirname, 'tsconfig.json'),
  entry: ['src/index.ts'],
  sourcemap: isDev,
})
