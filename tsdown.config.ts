import type { UserConfig } from 'tsdown'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'tsdown'

const repoRoot = import.meta.dirname
const require = createRequire(join(repoRoot, 'package.json'))
const nativeTypeScriptRoot = dirname(require.resolve('@typescript/native/package.json'))
const { default: getNativeTypeScriptExecutablePath } = await import(
  pathToFileURL(join(nativeTypeScriptRoot, 'lib/getExePath.js')).href,
)
const nativeTypeScriptExecutablePath = getNativeTypeScriptExecutablePath()

/**
 * Resolve installed `@vue/language-core` from a workspace package that depends on it,
 * then copy `types/template-helpers.d.ts` to `vue-vine/dist/vls-helpers.d.ts` on build (published as `vue-vine/vls-helpers`).
 */
function copyVueVineVlsHelpersDts() {
  const langCoreRoot = dirname(
    require.resolve('@vue/language-core/package.json', {
      paths: [join(repoRoot, 'packages/language-service')],
    }),
  )
  const sourceFile = join(langCoreRoot, 'types/template-helpers.d.ts')

  return {
    name: 'vue-vine:copy-vls-helpers-dts',
    async writeBundle(outputOptions: { dir?: string }) {
      const outDir = outputOptions.dir
      if (!outDir)
        return

      const pkgDir = dirname(outDir)
      let pkgName: string
      try {
        pkgName = JSON.parse(
          await readFile(join(pkgDir, 'package.json'), 'utf-8'),
        ).name
      }
      catch {
        return
      }
      if (pkgName !== 'vue-vine')
        return

      const destFile = join(pkgDir, 'dist/vls-helpers.d.ts')
      await mkdir(dirname(destFile), { recursive: true })
      await copyFile(sourceFile, destFile)
    },
  }
}

const isDev = process.env.NODE_ENV === 'development'
const buildConfig: UserConfig = defineConfig({
  workspace: {
    include: ['packages/*'],
    exclude: [
      'packages/docs',
      'packages/e2e-vite',
      'packages/e2e-rsstack',
      'packages/nuxt-module',
      'packages/playground',
    ],
  },
  // - @eslint/plugin-kit ships `types.cts` (not `types.d.cts`); rolldown-plugin-dts
  //   resolves `./types.cts` to a missing `types.d.cts` and fails. Keep it external for DTS.
  // - @typescript-eslint/typescript-estree: rolldown-plugin-dts falsely warns about
  //   `ThrowStatement` import from TS 6.0 (the export exists, but the DTS resolver
  //   fails on the very long type-union line). Keep it external to silence the warning.
  deps: {
    onlyBundle: false,
    neverBundle: [
      '@eslint/plugin-kit',
      '@typescript-eslint/typescript-estree',
    ],
  },
  dts: {
    generator: 'tsgo',
    tsgo: {
      path: nativeTypeScriptExecutablePath,
    },
  },
  tsconfig: join(import.meta.dirname, 'tsconfig.json'),
  entry: ['src/index.ts'],
  sourcemap: isDev,
  inputOptions: {
    // Keep the TypeScript SDK external: language-service packages receive it
    // from their host and should not bundle a compiler implementation.
    external: /^typescript(?:\/|$)/,
    resolve: {
      conditionNames: ['vine'],
    },
  },
  outExtensions: () => {
    return {
      js: '.js',
      dts: '.d.ts',
    }
  },
  outputOptions: {
    format: 'esm',
    banner: `
/**
  * Vue Vine - Another style of writing Vue components
  * @License MIT
  * @Author ShenQingchuan
  */\n\n
    `.trim(),
  },

  plugins: [
    copyVueVineVlsHelpersDts(),
  ],
})
export default buildConfig
