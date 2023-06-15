import type { SgNode } from '@ast-grep/napi'
import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineFnCompCtx, VinePropMeta, VineTemplateBindings } from '../types'
import { ruleCSSComplexExpIdentifier } from '../ast-grep/rules-for-script'
import { spaces } from '../utils'
import { VineBindingTypes } from '../types'

export const CSS_VARS_HELPER = 'useCssVars'
export const UN_REF_HELPER = 'unref'
function genUseCssVarsCode(varList: string) {
  return `_${CSS_VARS_HELPER}(_ctx => ({
${varList}
}))`
}

function findIdentifierFromExp(cssContent: string) {
  return ts.parse(cssContent).root().findAll(ruleCSSComplexExpIdentifier)
}

function genCSSVarsList(
  cssBindings: Record<string, string | null> | null,
  setupStmts: SgNode[],
  props: Record<string, VinePropMeta>,
  propsAlias: string,
  bindings: VineTemplateBindings,
  inline = false,
) {
  let res = ''
  if (cssBindings) {
    for (const cssBindKey in cssBindings) {
      // get hash
      const cssBindValue = cssBindings[cssBindKey]

      const ms = new MagicString(cssBindKey)
      // get Identifier sgNode
      // e.g ["(a + b) / 2 + 'px'"] -> ["a", "b"]
      const cssBindKeySgNodes = findIdentifierFromExp(cssBindKey)

      cssBindKeySgNodes.forEach((node) => {
        const range = node.range()
        // overwrite
        // e.g (a + b) / 2 + 'px' -> (_ctx.a + _ctx.b) / 2
        ms.overwrite(
          range.start.index,
          range.end.index,
          // non-inline mode only needs to rewrite the variable to `_ctx.x`
          inline ? genCSSVarsValue(node, bindings, propsAlias) : `_ctx.${node.text()}`,
        )
      })

      res = `${res}${spaces(2)}'${cssBindValue}': (${ms.toString()}),\n`
    }
  }

  return res
}
function genCSSVarsValue(
  node: SgNode,
  bindings: VineTemplateBindings,
  propsAlias: string,
) {
  let res = ''
  const nodeContent = node.text()
  for (const bindingsKey in bindings) {
    const bindingValue = bindings[bindingsKey]
    if (nodeContent === bindingsKey) {
      switch (bindingValue) {
        case VineBindingTypes.PROPS:
        case VineBindingTypes.PROPS_ALIASED:
          res = `${propsAlias}.${node.text()}`
          break
        case VineBindingTypes.SETUP_CONST:
        case VineBindingTypes.SETUP_REACTIVE_CONST:
        case VineBindingTypes.LITERAL_CONST:
          res = node.text()
          break
        case VineBindingTypes.SETUP_MAYBE_REF:
        case VineBindingTypes.SETUP_LET:
          res = `_unref(${node.text()})`
          break
        // The `vineProp` variable is inconsistent with vue here, and vue is `PROPS`
        // Because vine compilation will use `toRefs` processing
        case VineBindingTypes.SETUP_REF:
          res = `${node.text()}.value`
          break
        default:
          res = `_ctx.${node.text()}`
      }
    }
  }
  return res
}
export function compileCSSVars(
  vineFnCompCtx: VineFnCompCtx,
  inline = false,
) {
  const {
    cssBindings,
    setupStmts,
    props,
    propsAlias,
    bindings,
  } = vineFnCompCtx
  if (!cssBindings)
    return ''
  const varList = genCSSVarsList(
    cssBindings,
    setupStmts,
    props,
    propsAlias,
    bindings,
    inline,
  )
  return genUseCssVarsCode(varList)
}
