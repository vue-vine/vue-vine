import type { EnvironmentConfig, RsbuildPlugin } from '@rsbuild/core'
import type { VineCompilerOptions } from '@vue-vine/compiler'

const RE_VINE_STYLE = /vine-style/
const RE_VINE_TS = /\.vine\.ts$/
const RE_VUE_JS = /\.vue.js$/

export interface VineRsbuildPluginOptions {
  /**
   * Vue Vine compiler options
   */
  compilerOptions?: VineCompilerOptions
  /**
   * Target browser configuration for SWC loader transpilation
   * @default ['last 2 versions', '> 0.2%', 'not dead']
   */
  targets?: string[]
}

export function pluginVueVine(
  options: VineRsbuildPluginOptions = {},
): RsbuildPlugin {
  const {
    compilerOptions = {},
    targets = ['last 2 versions', '> 0.2%', 'not dead'],
  } = options

  return {
    name: 'vue-vine',
    setup(api) {
      // Modify Rspack config to integrate Vue Vine loader
      api.modifyRspackConfig((config) => {
        // Enable CSS experiments for Vine style modules
        if (!config.experiments) {
          config.experiments = {}
        }
        config.experiments.css = true

        // Initialize module.rules array
        if (!config.module) {
          config.module = {}
        }
        if (!config.module.rules) {
          config.module.rules = []
        }

        // Exclude .vine.ts files and vine-style from other rules to prevent double processing
        for (const rule of config.module.rules) {
          if (rule && typeof rule === 'object' && 'test' in rule) {
            // Exclude vine-style queries from CSS rules
            if (rule.test instanceof RegExp && rule.test.test('.css')) {
              if (!rule.resourceQuery) {
                rule.resourceQuery = { not: [RE_VINE_STYLE] }
              }
              else if (typeof rule.resourceQuery === 'object' && 'not' in rule.resourceQuery) {
                const existingNot = rule.resourceQuery.not
                if (Array.isArray(existingNot)) {
                  const hasVineStyle = existingNot.some(r =>
                    r instanceof RegExp && r.source === 'vine-style',
                  )
                  if (!hasVineStyle) {
                    existingNot.push(RE_VINE_STYLE)
                  }
                }
                else if (existingNot) {
                  rule.resourceQuery.not = [existingNot, RE_VINE_STYLE]
                }
              }
            }

            // Exclude .vine.ts files and vine-style queries from TypeScript/JavaScript rules
            if (rule.test instanceof RegExp && (rule.test.test('.ts') || rule.test.test('.js'))) {
              // Exclude .vine.ts files from being processed by default TS rules
              if (!rule.exclude) {
                rule.exclude = [RE_VINE_TS]
              }
              else if (Array.isArray(rule.exclude)) {
                if (!rule.exclude.some(e => e instanceof RegExp && e.source === '\\.vine\\.ts$')) {
                  rule.exclude.push(RE_VINE_TS)
                }
              }
              else if (rule.exclude instanceof RegExp) {
                rule.exclude = [rule.exclude, RE_VINE_TS]
              }

              // Also exclude vine-style queries
              if (!rule.resourceQuery) {
                rule.resourceQuery = { not: [RE_VINE_STYLE] }
              }
              else if (typeof rule.resourceQuery === 'object' && 'not' in rule.resourceQuery) {
                const existingNot = rule.resourceQuery.not
                if (Array.isArray(existingNot)) {
                  const hasVineStyle = existingNot.some(r =>
                    r instanceof RegExp && r.source === 'vine-style',
                  )
                  if (!hasVineStyle) {
                    existingNot.push(RE_VINE_STYLE)
                  }
                }
                else if (existingNot) {
                  rule.resourceQuery.not = [existingNot, RE_VINE_STYLE]
                }
              }
            }
          }
        }

        // Add processing rules for Vine style virtual modules
        // IMPORTANT: Must be added first to have higher priority than other rules
        config.module.rules.unshift({
          resourceQuery: RE_VINE_STYLE,
          use: [
            {
              loader: '@vue-vine/rspack-loader/style-loader',
            },
          ],
          type: 'css',
        })

        // Add processing rules for .vine.ts files
        // Loaders execute from right to left (bottom to top):
        // 1. @vue-vine/rspack-loader: Transform Vine components to TypeScript
        // 2. builtin:swc-loader: Transform TypeScript to JavaScript
        config.module.rules.unshift({
          test: RE_VINE_TS,
          resourceQuery: { not: [RE_VINE_STYLE] },
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                  },
                },
                env: { targets },
              },
            },
            {
              loader: '@vue-vine/rspack-loader',
              options: {
                compilerOptions,
              },
            },
          ],
        })

        // Initialize plugins array
        if (!config.plugins) {
          config.plugins = []
        }

        return config
      })

      // Give preset source.define
      api.modifyEnvironmentConfig((config, { mergeEnvironmentConfig }) => {
        const extraConfig: EnvironmentConfig = {
          source: {
            define: {
              // https://link.vuejs.org/feature-flags
              __VUE_OPTIONS_API__: true,
              __VUE_PROD_DEVTOOLS__: false,
              __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
            },
            // should transpile all scripts from Vue SFC
            include: [RE_VUE_JS],
          },
        }

        const merged = mergeEnvironmentConfig(extraConfig, config)
        return merged
      })
    },
  }
}
