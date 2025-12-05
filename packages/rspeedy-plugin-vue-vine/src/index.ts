// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { RsbuildPlugin, RsbuildPluginAPI, Rspack, RspackChain } from '@rsbuild/core'

import { createRequire } from 'node:module'
import path from 'node:path'
import { RuntimeWrapperWebpackPlugin } from '@lynx-js/runtime-wrapper-webpack-plugin'
import { LynxEncodePlugin, LynxTemplatePlugin } from '@lynx-js/template-webpack-plugin'
import { rspack } from '@rsbuild/core'
import {
  getBackgroundLayerDefines,
  getMainThreadLayerDefines,
  getSharedDefines,
} from './config/define'
import {
  DEFAULT_DIST_PATH_INTERMEDIATE,
  LAYERS,
  PLUGIN_NAME,
  PLUGIN_NAME_TEMPLATE,
} from './constants'
import { extractImports, generateEntryPaths } from './helpers/entry'
import { MainThreadAssetMarkerPlugin } from './plugins/main-thread-marker'

const require = createRequire(import.meta.url)

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

      // Set 'all-in-one' strategy to bundle everything together (like ReactLynx)
      api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) => {
        const userConfig = api.getRsbuildConfig('original')
        if (!userConfig.performance?.chunkSplit?.strategy) {
          return mergeRsbuildConfig(config, {
            performance: {
              chunkSplit: {
                strategy: 'all-in-one',
              },
            },
          })
        }
        return config
      })

      api.modifyBundlerChain((chain, { environment, isDev }) => {
        if (environment.name !== 'lynx') {
          return
        }

        const entries = chain.entryPoints.entries() ?? {}
        configureChain(chain, {
          entries,
          isDev,
          debug,
          rspeedyAPIs,
        })
      })
    },
  }
}

interface ConfigureChainOptions {
  entries: Record<string, { values: () => Iterable<string | string[] | Rspack.EntryDescription> }>
  isDev: boolean
  debug: boolean
  rspeedyAPIs: {
    config: { output?: { filename?: string | { bundle?: string } } }
    debug: (fn: () => string) => void
  } | undefined
}

function configureChain(
  chain: RspackChain,
  options: ConfigureChainOptions,
): void {
  const { entries, isDev, debug, rspeedyAPIs } = options
  const mainThreadChunks: string[] = []

  // Clear original entries
  chain.entryPoints.clear()

  // Configure entries for each original entry
  Object.entries(entries).forEach(([entryName, entryPoint]) => {
    const userImports = extractImports(entryPoint.values())
    const entryPaths = generateEntryPaths(entryName, DEFAULT_DIST_PATH_INTERMEDIATE)

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
        chunks: [entryPaths.mainThreadEntry, entryPaths.backgroundEntry],
        filename: templateFilename,
        intermediate: path.posix.join(DEFAULT_DIST_PATH_INTERMEDIATE, entryName),
        customCSSInheritanceList: [],
        debugInfoOutside: false,
        defaultDisplayLinear: false,
        enableAccessibilityElement: false,
        enableCSSInheritance: false,
        enableCSSInvalidation: false,
        enableCSSSelector: false,
        enableA11y: false,
        enableNewGesture: false,
        enableRemoveCSSScope: false,
        removeDescendantSelectorScope: false,
        targetSdkVersion: '3.2',
        cssPlugins: [],
      }])
      .end()
  })

  // Add webpack plugins
  addWebpackPlugins(chain, {
    mainThreadChunks,
    debug,
    isDev,
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
}

function addWebpackPlugins(
  chain: RspackChain,
  options: AddWebpackPluginsOptions,
): void {
  const { mainThreadChunks, debug, isDev } = options

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
  chain
    .plugin(`${PLUGIN_NAME}-define`)
    .use(rspack.DefinePlugin, [getSharedDefines(isDev)])
    .end()

  // Add layer-specific module rules for __MAIN_THREAD__ and __BACKGROUND__ macros
  // These use SWC's define feature to replace macros at transpile time
  configureLayerSpecificRules(chain)
}

/**
 * Configure layer-specific module rules for .vine.ts files and macro replacement.
 *
 * When using webpack/rspack layer mechanism, each layer has isolated module resolution.
 * We need to add .vine.ts processing rules for each layer explicitly.
 */
function configureLayerSpecificRules(chain: RspackChain): void {
  const mainThreadDefines = getMainThreadLayerDefines()
  const backgroundDefines = getBackgroundLayerDefines()

  // .vine.ts processing for main-thread layer
  // Loaders execute bottom-to-top: vine-loader -> swc-loader
  chain.module
    .rule('vue-vine-lynx-main-thread-vine')
    .test(/\.vine\.ts$/)
    .issuerLayer(LAYERS.MAIN_THREAD)
    .resourceQuery({ not: [/vine-style/] })
    .use('swc-loader')
    .loader('builtin:swc-loader')
    .options({
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          optimizer: {
            globals: { vars: mainThreadDefines },
          },
        },
      },
    })
    .end()
    .use('vine-loader')
    .loader(require.resolve('@vue-vine/rspack-loader'))
    .options({ compilerOptions: { lynx: { enabled: true } } })
    .end()

  // .vine.ts processing for background layer
  chain.module
    .rule('vue-vine-lynx-background-vine')
    .test(/\.vine\.ts$/)
    .issuerLayer(LAYERS.BACKGROUND)
    .resourceQuery({ not: [/vine-style/] })
    .use('swc-loader')
    .loader('builtin:swc-loader')
    .options({
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: {
          optimizer: {
            globals: { vars: backgroundDefines },
          },
        },
      },
    })
    .end()
    .use('vine-loader')
    .loader(require.resolve('@vue-vine/rspack-loader'))
    .options({ compilerOptions: { lynx: { enabled: true } } })
    .end()

  // Regular .ts/.js files macro replacement for main-thread layer
  chain.module
    .rule('vue-vine-lynx-main-thread-defines')
    .test(/\.[jt]sx?$/)
    .exclude
    .add(/\.vine\.ts$/)
    .end()
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

  // Regular .ts/.js files macro replacement for background layer
  chain.module
    .rule('vue-vine-lynx-background-defines')
    .test(/\.[jt]sx?$/)
    .exclude
    .add(/\.vine\.ts$/)
    .end()
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
