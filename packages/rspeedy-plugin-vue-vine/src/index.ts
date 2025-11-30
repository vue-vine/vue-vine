// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { RsbuildPlugin, RsbuildPluginAPI, Rspack } from '@rsbuild/core'

import { createRequire } from 'node:module'
import path from 'node:path'

// Layer names for dual-thread code splitting
export const LAYERS = {
  MAIN_THREAD: 'vue-vine:main-thread',
  BACKGROUND: 'vue-vine:background',
} as const

export interface PluginVueVineLynxOptions {
  /**
   * Enable debug logging
   */
  debug?: boolean
}

const PLUGIN_NAME = 'vue-vine-lynx'
const PLUGIN_NAME_TEMPLATE = 'lynx:template'
const DEFAULT_DIST_PATH_INTERMEDIATE = '.rspeedy'

/**
 * Webpack plugin to mark main thread assets with 'lynx:main-thread' info.
 * This is required for LynxTemplatePlugin to correctly identify main thread code.
 */
class MainThreadAssetMarkerPlugin {
  private mainThreadChunks: string[]
  private debug: boolean

  constructor(mainThreadChunks: string[], debug = false) {
    this.mainThreadChunks = mainThreadChunks
    this.debug = debug
  }

  apply(compiler: Rspack.Compiler): void {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation: Rspack.Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          for (const name of this.mainThreadChunks) {
            const asset = compilation.getAsset(name)
            if (!asset) {
              if (this.debug) {
                console.warn(`[${PLUGIN_NAME}] Main thread asset not found: ${name}`)
              }
              continue
            }

            // Mark asset as main thread for LynxTemplatePlugin
            compilation.updateAsset(
              asset.name,
              asset.source,
              {
                ...asset.info,
                'lynx:main-thread': true,
              },
            )

            if (this.debug) {
              console.log(`[${PLUGIN_NAME}] Marked asset as main-thread: ${name}`)
            }
          }
        },
      )
    })
  }
}

/**
 * Vue Vine plugin for Lynx (rspeedy)
 *
 * This plugin configures rspeedy to:
 * 1. Split code into main-thread and background bundles
 * 2. Generate .lynx.bundle output
 * 3. Inject runtime-lynx for Lynx PAPI support
 */
export function pluginVueVineLynx(
  options: PluginVueVineLynxOptions = {},
): RsbuildPlugin {
  const { debug = false } = options

  // Store mainThreadChunks across hook calls
  const mainThreadChunks: string[] = []

  return {
    name: PLUGIN_NAME,
    // Must run after rspeedy core plugin
    pre: ['lynx:rsbuild:plugin-api'],

    async setup(api: RsbuildPluginAPI) {
      // Get rspeedy exposed APIs
      const rspeedyAPIs = api.useExposed<{
        config: { output?: { filename?: string | { bundle?: string } } }
        debug: (fn: () => string) => void
      }>(Symbol.for('rspeedy.api'))

      if (debug && rspeedyAPIs) {
        rspeedyAPIs.debug(() => `[${PLUGIN_NAME}] Plugin initialized`)
      }

      // Use dynamic import for ESM packages
      let LynxTemplatePlugin: any
      let LynxEncodePlugin: any
      let RuntimeWrapperWebpackPlugin: any
      let DefinePlugin: any

      try {
        // @lynx-js/template-webpack-plugin is ESM, use dynamic import
        const templatePlugin = await import('@lynx-js/template-webpack-plugin')
        LynxTemplatePlugin = templatePlugin.LynxTemplatePlugin
        LynxEncodePlugin = templatePlugin.LynxEncodePlugin
      }
      catch (e) {
        console.error(`[${PLUGIN_NAME}] Failed to load @lynx-js/template-webpack-plugin:`, e)
        return
      }

      try {
        // @lynx-js/runtime-wrapper-webpack-plugin is also ESM
        const runtimeWrapper = await import('@lynx-js/runtime-wrapper-webpack-plugin')
        RuntimeWrapperWebpackPlugin = runtimeWrapper.RuntimeWrapperWebpackPlugin
      }
      catch (e) {
        console.error(`[${PLUGIN_NAME}] Failed to load @lynx-js/runtime-wrapper-webpack-plugin:`, e)
        return
      }

      // Use createRequire for CJS packages
      const require = createRequire(import.meta.url)
      try {
        const rspack = require('@rspack/core')
        DefinePlugin = rspack.DefinePlugin
      }
      catch {
        // Fallback: DefinePlugin might not be available
        DefinePlugin = null
      }

      api.modifyBundlerChain((chain, { environment, isDev }) => {
        const entries = chain.entryPoints.entries() ?? {}
        const isLynx = environment.name === 'lynx'

        if (!isLynx) {
          return
        }

        // Clear original entries
        chain.entryPoints.clear()

        // Enable webpack layers experiment
        chain.experiments({
          ...chain.get('experiments'),
          layers: true,
        })

        // Clear previous chunks (in case of rebuild)
        mainThreadChunks.length = 0

        // Process each entry
        Object.entries(entries).forEach(([entryName, entryPoint]) => {
          const imports = getImports(entryPoint.values())

          const templateFilename = (
            typeof rspeedyAPIs?.config.output?.filename === 'object'
              ? rspeedyAPIs.config.output.filename.bundle
              : rspeedyAPIs?.config.output?.filename
          ) ?? '[name].[platform].bundle'

          const mainThreadEntry = `${entryName}__main-thread`
          const backgroundEntry = entryName

          const mainThreadName = path.posix.join(
            DEFAULT_DIST_PATH_INTERMEDIATE,
            `${entryName}/main-thread.js`,
          )

          const backgroundName = path.posix.join(
            DEFAULT_DIST_PATH_INTERMEDIATE,
            `${entryName}/background.js`,
          )

          mainThreadChunks.push(mainThreadName)

          // Main thread entry - includes runtime-lynx for PAPI injection
          chain
            .entry(mainThreadEntry)
            .add({
              layer: LAYERS.MAIN_THREAD,
              import: imports,
              filename: mainThreadName,
            })
            .end()

          // Background entry
          chain
            .entry(backgroundEntry)
            .add({
              layer: LAYERS.BACKGROUND,
              import: imports,
              filename: backgroundName,
            })
            .when(isDev, (entry) => {
              // Add HMR support in dev mode
              entry
                .prepend({
                  layer: LAYERS.BACKGROUND,
                  import: '@rspack/core/hot/dev-server',
                })
                .prepend({
                  layer: LAYERS.BACKGROUND,
                  import: '@lynx-js/webpack-dev-transport/client',
                })
            })
            .end()

          // Add LynxTemplatePlugin to generate .lynx.bundle
          chain
            .plugin(`${PLUGIN_NAME_TEMPLATE}-${entryName}`)
            .use(LynxTemplatePlugin, [{
              // Use 'custom' or a generic DSL since Vue doesn't have official Lynx support
              dsl: 'custom',
              chunks: [mainThreadEntry, backgroundEntry],
              filename: templateFilename
                .replaceAll('[name]', entryName)
                .replaceAll('[platform]', environment.name),
              intermediate: path.posix.join(
                DEFAULT_DIST_PATH_INTERMEDIATE,
                entryName,
              ),
              // Lynx options
              debugInfoOutside: true,
              defaultDisplayLinear: true,
              enableA11y: true,
              enableCSSSelector: true,
              enableParallelElement: true,
              enableRemoveCSSScope: true,
              pipelineSchedulerConfig: 0x00010000,
              removeDescendantSelectorScope: true,
              targetSdkVersion: '3.2',
            }])
            .end()
        })

        // Add MainThreadAssetMarkerPlugin to mark main thread assets
        // This must be added BEFORE LynxTemplatePlugin processes assets
        chain
          .plugin(`${PLUGIN_NAME}-main-thread-marker`)
          .use(MainThreadAssetMarkerPlugin, [mainThreadChunks, debug])
          .end()

        // Add RuntimeWrapperWebpackPlugin
        chain
          .plugin(`${PLUGIN_NAME}-runtime-wrapper`)
          .use(RuntimeWrapperWebpackPlugin, [{
            targetSdkVersion: '3.2',
            // Wrap all .js files except main-thread.js
            test: /^(?!.*main-thread(?:\.[A-Fa-f0-9]*)?\.js$).*\.js$/,
          }])
          .end()

        // Add LynxEncodePlugin
        chain
          .plugin(`${PLUGIN_NAME}-encode`)
          .use(LynxEncodePlugin, [{ inlineScripts: true }])
          .end()

        // Define Vue feature flags
        if (DefinePlugin) {
          chain
            .plugin(`${PLUGIN_NAME}-define`)
            .use(DefinePlugin, [{
              __VUE_OPTIONS_API__: JSON.stringify(true),
              __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
              __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
            }])
            .end()
        }

        if (debug) {
          console.log(`[${PLUGIN_NAME}] Configured entries:`, Object.keys(entries))
          console.log(`[${PLUGIN_NAME}] Main thread chunks:`, mainThreadChunks)
        }
      })
    },
  }
}

/**
 * Extract import paths from entry point values
 */
function getImports(
  entryValue: Iterable<string | string[] | Rspack.EntryDescription>,
): string[] {
  const imports: string[] = []

  for (const item of entryValue) {
    if (typeof item === 'string') {
      imports.push(item)
    }
    else if (Array.isArray(item)) {
      imports.push(...item)
    }
    else if (item && typeof item === 'object' && 'import' in item) {
      if (Array.isArray(item.import)) {
        imports.push(...item.import)
      }
      else if (typeof item.import === 'string') {
        imports.push(item.import)
      }
    }
  }

  return imports
}

export default pluginVueVineLynx
