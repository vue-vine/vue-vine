import type { PluginCreator } from 'postcss'
import MagicString from 'magic-string'
import type { VineFileCtx } from '../types'
import { parseCssVars } from './analyze-css-vars'

interface CSSVarsPluginOptions {
  fileCtx: VineFileCtx
  scopeId: string
}
interface CSSVarsRange {
  start: number | null
  end: number | null
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
            const range = {
              start: null,
              end: null,
            } as CSSVarsRange
            const content = parseCssVars([ctx.value],
              {
                getIndex(start: number, end: number) {
                  range.start = start
                  range.end = end
                },
              })
            if (content[0] === cbKey) {
              const mg = new MagicString(ctx.value)
              mg.overwrite(range.start!, range.end!, `--${cssBindings[cbKey]}`)
              mg.replaceAll('v-bind', 'var')
              ctx.value = mg.toString()
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
