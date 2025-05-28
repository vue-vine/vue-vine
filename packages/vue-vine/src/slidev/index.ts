import type { Component, Plugin } from 'vue'

function isVineComponent(component: unknown): component is Component & { __vue_vine?: boolean } {
  return (
    typeof component === 'object'
    && component !== null
    && '__vue_vine' in component
    && component.__vue_vine === true
  )
}

/**
 *
 * @param globModules Please use `import.meta.glob(...)` to get the glob modules.
 *
 * ```ts
 * // setup/main.ts
 * import { VueVineSlidevPlugin } from 'vue-vine/slidev'
 * import { defineAppSetup } from '@slidev/types'
 *
 * export default defineAppSetup(({ app }) => {
 *   app.use(
 *     VueVineSlidevPlugin(
 *       import.meta.glob('./components/*.vine.ts', { eager: true })
 *     )
 *   )
 * })
 * ```
 *
 * @returns A Vue plugin that you can use with `app.use(...)`
 */
export function VueVineSlidevPlugin(globModules: Record<string, unknown>): Plugin {
  return {
    install(app) {
      const vineFiles = Object.values(globModules)
      for (const vineFile of vineFiles) {
        for (const [key, vineComponent] of Object.entries(vineFile as Record<string, unknown>)) {
          if (isVineComponent(vineComponent)) {
            app.component(key, vineComponent)
          }
        }
      }
    },
  }
}
