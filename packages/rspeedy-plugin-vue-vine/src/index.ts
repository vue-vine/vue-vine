// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { RsbuildPlugin, RsbuildPluginAPI, Rspack, RspackChain } from '@rsbuild/core'

import { createRequire } from 'node:module'
import path from 'node:path'
import {
  getBackgroundLayerDefines,
  getMainThreadLayerDefines,
  getSharedDefines,
} from './config/define'
import {
  DEFAULT_DIST_PATH_INTERMEDIATE,
  DEFAULT_LYNX_TEMPLATE_OPTIONS,
  LAYERS,
  PLUGIN_NAME,
  PLUGIN_NAME_TEMPLATE,
} from './constants'
import { extractImports, generateEntryPaths } from './helpers/entry'
import { MainThreadAssetMarkerPlugin } from './plugins/main-thread-marker'

export { LAYERS } from './constants'

export interface PluginVueVineLynxOptions {
  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Vue Vine plugin for Lynx (rspeedy)
 *
 * This plugin configures rspeedy to:
 * 1. Split code into main-thread and background bundles
 * 2. Generate .lynx.bundle output
 * 3. Inject runtime-lynx for Lynx PAPI support
 * 4. Enable dead code elimination for build-time macros
 */
export function pluginVueVineLynx(
  options: PluginVueVineLynxOptions = {},
): RsbuildPlugin {
  const { debug = false } = options
  const mainThreadChunks: string[] = []

  return {
    name: PLUGIN_NAME,
    pre: ['lynx:rsbuild:plugin-api'],

    async setup(api: RsbuildPluginAPI) {
      const rspeedyAPIs = api.useExposed<{
        config: { output?: { filename?: string | { bundle?: string } } }
        debug: (fn: () => string) => void
      }>(Symbol.for('rspeedy.api'))

      if (debug && rspeedyAPIs) {
        rspeedyAPIs.debug(() => `[${PLUGIN_NAME}] Plugin initialized`)
      }

      // Load external plugins
      const plugins = await loadExternalPlugins()
      if (!plugins) {
        return
      }

      const { LynxTemplatePlugin, LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin } = plugins

      api.modifyBundlerChain((chain, { environment, isDev }) => {
        if (environment.name !== 'lynx') {
          return
        }

        const entries = chain.entryPoints.entries() ?? {}
        configureChain(chain, {
          entries,
          isDev,
          debug,
          mainThreadChunks,
          rspeedyAPIs,
          plugins: { LynxTemplatePlugin, LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin },
        })
      })
    },
  }
}

interface ExternalPlugins {
  LynxTemplatePlugin: any
  LynxEncodePlugin: any
  RuntimeWrapperWebpackPlugin: any
  DefinePlugin: any
}

async function loadExternalPlugins(): Promise<ExternalPlugins | null> {
  let LynxTemplatePlugin: any
  let LynxEncodePlugin: any
  let RuntimeWrapperWebpackPlugin: any
  let DefinePlugin: any

  try {
    const templatePlugin = await import('@lynx-js/template-webpack-plugin')
    LynxTemplatePlugin = templatePlugin.LynxTemplatePlugin
    LynxEncodePlugin = templatePlugin.LynxEncodePlugin
  }
  catch (e) {
    console.error(`[${PLUGIN_NAME}] Failed to load @lynx-js/template-webpack-plugin:`, e)
    return null
  }

  try {
    const runtimeWrapper = await import('@lynx-js/runtime-wrapper-webpack-plugin')
    RuntimeWrapperWebpackPlugin = runtimeWrapper.RuntimeWrapperWebpackPlugin
  }
  catch (e) {
    console.error(`[${PLUGIN_NAME}] Failed to load @lynx-js/runtime-wrapper-webpack-plugin:`, e)
    return null
  }

  const require = createRequire(import.meta.url)
  try {
    const rspack = require('@rspack/core')
    DefinePlugin = rspack.DefinePlugin
  }
  catch {
    DefinePlugin = null
  }

  return { LynxTemplatePlugin, LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin }
}

interface ConfigureChainOptions {
  entries: Record<string, { values: () => Iterable<string | string[] | Rspack.EntryDescription> }>
  isDev: boolean
  debug: boolean
  mainThreadChunks: string[]
  rspeedyAPIs: {
    config: { output?: { filename?: string | { bundle?: string } } }
    debug: (fn: () => string) => void
  } | undefined
  plugins: ExternalPlugins
}

function configureChain(
  chain: RspackChain,
  options: ConfigureChainOptions,
): void {
  const { entries, isDev, debug, mainThreadChunks, rspeedyAPIs, plugins } = options
  const { LynxTemplatePlugin, LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin } = plugins

  // Clear original entries
  chain.entryPoints.clear()

  // Add Vue Vine loader for .vine.ts files
  configureVineLoader(chain)

  mainThreadChunks.length = 0

  // Configure entries for each original entry
  Object.entries(entries).forEach(([entryName, entryPoint]) => {
    const userImports = extractImports(entryPoint.values())
    const entryPaths = generateEntryPaths(entryName, DEFAULT_DIST_PATH_INTERMEDIATE, path)

    mainThreadChunks.push(entryPaths.mainThreadFilename)

    // Main thread entry: runtime-lynx/entry-main (bootstrap only)
    // Only contains PAPI setup and worklet runtime initialization
    // User code runs here for initial render via layer mechanism
    chain
      .entry(entryPaths.mainThreadEntry)
      .add({
        import: ['@vue-vine/runtime-lynx/entry-main', ...userImports],
        layer: LAYERS.MAIN_THREAD,
        filename: entryPaths.mainThreadFilename,
      })
      .end()

    // Background entry: runtime-lynx/entry-background + user app code
    // Vue runs here with full runtime for state management and effects
    chain
      .entry(entryPaths.backgroundEntry)
      .add({
        import: ['@vue-vine/runtime-lynx/entry-background', ...userImports],
        layer: LAYERS.BACKGROUND,
        filename: entryPaths.backgroundFilename,
      })
      .when(isDev, (entry: RspackChain.EntryPoint) => {
        entry
          .prepend({
            import: '@rspack/core/hot/dev-server',
          })
          .prepend({
            import: '@lynx-js/webpack-dev-transport/client',
          })
      })
      .end()

    // Add LynxTemplatePlugin
    const templateFilename = getTemplateFilename(rspeedyAPIs, entryName, 'lynx')
    chain
      .plugin(`${PLUGIN_NAME_TEMPLATE}-${entryName}`)
      .use(LynxTemplatePlugin, [{
        ...DEFAULT_LYNX_TEMPLATE_OPTIONS,
        chunks: [entryPaths.mainThreadEntry, entryPaths.backgroundEntry],
        filename: templateFilename,
        intermediate: path.posix.join(DEFAULT_DIST_PATH_INTERMEDIATE, entryName),
      }])
      .end()
  })

  // Add webpack plugins
  addWebpackPlugins(chain, {
    mainThreadChunks,
    debug,
    isDev,
    plugins: { LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin },
  })

  // Configure optimization: disable code splitting for main-thread
  chain.optimization.splitChunks({
    chunks: (chunk) => {
      const isMainThread = chunk.name?.includes('main-thread')
      return !isMainThread
    },
  })

  if (debug) {
    console.log(`[${PLUGIN_NAME}] Configured entries:`, Object.keys(entries))
    console.log(`[${PLUGIN_NAME}] Main thread chunks:`, mainThreadChunks)
  }
}

interface AddWebpackPluginsOptions {
  mainThreadChunks: string[]
  debug: boolean
  isDev: boolean
  plugins: Pick<ExternalPlugins, 'LynxEncodePlugin' | 'RuntimeWrapperWebpackPlugin' | 'DefinePlugin'>
}

function addWebpackPlugins(
  chain: RspackChain,
  options: AddWebpackPluginsOptions,
): void {
  const { mainThreadChunks, debug, isDev, plugins } = options
  const { LynxEncodePlugin, RuntimeWrapperWebpackPlugin, DefinePlugin } = plugins

  // Mark main thread assets
  chain
    .plugin(`${PLUGIN_NAME}-main-thread-marker`)
    .use(MainThreadAssetMarkerPlugin, [mainThreadChunks, debug])
    .end()

  // Runtime wrapper
  chain
    .plugin(`${PLUGIN_NAME}-runtime-wrapper`)
    .use(RuntimeWrapperWebpackPlugin, [{
      targetSdkVersion: '3.2',
      test: /^(?!.*main-thread(?:\.[A-Fa-f0-9]*)?\.js$).*\.js$/,
    }])
    .end()

  // Lynx encode
  chain
    .plugin(`${PLUGIN_NAME}-encode`)
    .use(LynxEncodePlugin, [{ inlineScripts: true }])
    .end()

  // Define plugin with build-time macros
  // Note: __MAIN_THREAD__ and __BACKGROUND__ are handled via layer-specific rules
  if (DefinePlugin) {
    chain
      .plugin(`${PLUGIN_NAME}-define`)
      .use(DefinePlugin, [getSharedDefines(isDev)])
      .end()
  }

  // Add layer-specific module rules for __MAIN_THREAD__ and __BACKGROUND__ macros
  // These use SWC's define feature to replace macros at transpile time
  configureLayerSpecificRules(chain)
}

/**
 * Configure layer-specific module rules for macro replacement.
 *
 * Uses SWC's `jsc.transform.optimizer.globals.vars` to replace
 * __MAIN_THREAD__ and __BACKGROUND__ macros based on the issuer layer.
 */
function configureLayerSpecificRules(chain: RspackChain): void {
  const mainThreadDefines = getMainThreadLayerDefines()
  const backgroundDefines = getBackgroundLayerDefines()

  // Main thread layer: __MAIN_THREAD__ = true, __BACKGROUND__ = false
  chain.module
    .rule('vue-vine-lynx-main-thread-defines')
    .test(/\.[jt]sx?$/)
    .issuerLayer(LAYERS.MAIN_THREAD)
    .use('swc-define-main')
    .loader('builtin:swc-loader')
    .options({
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          optimizer: {
            globals: {
              vars: mainThreadDefines,
            },
          },
        },
      },
    })
    .end()

  // Background layer: __MAIN_THREAD__ = false, __BACKGROUND__ = true
  chain.module
    .rule('vue-vine-lynx-background-defines')
    .test(/\.[jt]sx?$/)
    .issuerLayer(LAYERS.BACKGROUND)
    .use('swc-define-background')
    .loader('builtin:swc-loader')
    .options({
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          optimizer: {
            globals: {
              vars: backgroundDefines,
            },
          },
        },
      },
    })
    .end()
}

/**
 * Configure Vue Vine loader for .vine.ts files
 */
function configureVineLoader(chain: RspackChain): void {
  // Get the path to our loader (use package export path)
  const loaderPath = require.resolve('@vue-vine/rspeedy-plugin-vue-vine/vine-loader')

  // Add rule for .vine.ts files with 'pre' to run before default rules
  chain.module
    .rule('vue-vine')
    .pre() // Run this rule before normal rules (before rspeedy's default .ts handling)
    .test(/\.vine\.ts$/)
    .type('javascript/auto') // Prevent default asset handling
    // 2. Transpile TypeScript to JavaScript
    .use('swc-loader')
    .loader('builtin:swc-loader')
    .options({
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false,
        },
        target: 'es2020',
      },
    })
    .end()
    // 1. First compile Vue Vine syntax (outputs TS)
    .use('vine-loader')
    .loader(loaderPath)
    .options({
      lynxEnabled: true,
    })
    .end()
}

function getTemplateFilename(
  rspeedyAPIs: ConfigureChainOptions['rspeedyAPIs'],
  entryName: string,
  platform: string,
): string {
  const filenameConfig = rspeedyAPIs?.config.output?.filename
  const template = (
    typeof filenameConfig === 'object'
      ? filenameConfig.bundle
      : filenameConfig
  ) ?? '[name].[platform].bundle'

  return template
    .replaceAll('[name]', entryName)
    .replaceAll('[platform]', platform)
}

export default pluginVueVineLynx
