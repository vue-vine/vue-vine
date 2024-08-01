import { defineNuxtModule } from '@nuxt/kit'
import { VineVitePlugin } from 'vue-vine/vite'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@vue-vine/nuxt',
    configKey: 'vueVineNuxtModule',
    compatibility: {
      // Semver version of supported nuxt versions
      nuxt: '>=3.0.0'
    }
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
      config.plugins.unshift(VineVitePlugin())
    })
  },
})
