import type { NuxtPage } from '@nuxt/schema'
import type { PluginOption } from 'vite'
import { defineNuxtModule } from '@nuxt/kit'
import { consola } from 'consola'
import { colorize } from 'consola/utils'
import { VineVitePlugin } from 'vue-vine/vite'

// Module options TypeScript interface definition
export interface ModuleOptions {
  // ...
}

function plur(count: number, plural: string, singular: string = '') {
  return count <= 1 ? singular : plural
}

function addPages(pages: NuxtPage[]) {
  const count = { sfc: 0, vine: 0 }
  for (const page of pages) {
    if (page.file?.endsWith('.vine.ts')) {
      page.path = page.path.replace('.vine', '')
      page.path = page.path === '/index' ? '/' : page.path

      count.vine += 1
    }
    else if (page.file?.endsWith('.vue')) {
      count.sfc += 1
    }
  }
  consola.success(`
  Added ${count.vine} page${plur(count.vine, 's')} by ${colorize('blue', 'Vine (.vine.ts)')},
  Added ${count.sfc} page${plur(count.sfc, 's')} by ${colorize('green', 'SFC (.vue)')}
  `.trim())
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@vue-vine/nuxt',
    configKey: 'vueVineNuxtModule',
    compatibility: {
      // Semver version of supported nuxt versions
      nuxt: '>=3.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup(_options, _nuxt) {
    _nuxt.options.typescript.tsConfig ||= {}
    _nuxt.options.typescript.tsConfig.compilerOptions ||= {}
    const compilerOptions = _nuxt.options.typescript.tsConfig
      .compilerOptions

    compilerOptions.types ||= []
    compilerOptions.types.push('vue-vine/macros')

    _nuxt.hook('vite:extend', async ({ config }) => {
      config.plugins = config.plugins || []
      config.plugins.unshift(VineVitePlugin() as PluginOption)
    })

    _nuxt.hook('pages:extend', pages => addPages(pages))
  },
})
