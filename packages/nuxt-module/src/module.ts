import type { NuxtPage } from '@nuxt/schema'
import type { PluginOption } from 'vite'
import { defineNuxtModule } from '@nuxt/kit'
import { VineVitePlugin } from 'vue-vine/vite'
import { consola } from 'consola'

// Module options TypeScript interface definition
export interface ModuleOptions {}

function endsWith(searchString: string | undefined, extension: string, suffix?: string) {
  return searchString?.endsWith(`.${suffix ? `${suffix}.` : '' }${extension}`)
}

function plur(count: number, plural: string, singular: string = '') {
  return count === 1 ? singular : plural
}

function addPages(pages: NuxtPage[]) {
  const count = {sfc: 0, vine: 0} 
  for (const page of pages) {
    console.log(page.file)
    if ( endsWith(page.file, 'ts', 'vine')) {
      page.path = page.path.replace('.vine', '')
      page.path = page.path === '/index' ? '/' : page.path

      count.vine += 1
    } else if (endsWith(page.file, 'vue')) {
      count.sfc += 1
    }
  }
  consola.success(`Added ${count.vine} Vue Vine page${plur(count.vine, 's')}, ${count.sfc} SFC page${plur(count.sfc, 's')}.`)
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

    _nuxt.hook('pages:extend', (pages) => addPages(pages))
  },
})
