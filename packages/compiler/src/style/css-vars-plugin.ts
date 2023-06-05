// TODO unit test
import type { PluginCreator } from 'postcss'
import type { VineFileCtx } from '../types'

interface CSSVarsPluginOptions {
  fileCtx: VineFileCtx
  scopeId: string
}

const cssVarsPlugin: PluginCreator<CSSVarsPluginOptions> = (options) => {
  const { vineFnComps } = options!.fileCtx
  let cssBindings = {} as Record<string, string | null> | null
  // Obtain the cssvar information corresponding to
  // the component context according to scopeid
  vineFnComps.some((fnComp) => {
    if (fnComp.scopeId === options!.scopeId) {
      cssBindings = fnComp.cssBindings
      return true
    }
    return false
  })
  return {
    postcssPlugin: 'vine-style-css-vars',
    Once(root) {
      root.walk((ctx) => {
        if (ctx.type === 'decl' && ctx.value && ctx.value.includes('v-bind')) {
          for (const cbKey in cssBindings) {
            if (ctx.value.includes(cbKey)) {
              ctx.value = `var(--${cssBindings[cbKey]})`
              break
            }
          }
        }
      })
    },
  }
}

cssVarsPlugin.postcss = true
export {
  cssVarsPlugin,
}
