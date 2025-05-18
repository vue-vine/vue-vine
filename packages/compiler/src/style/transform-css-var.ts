import type { Identifier, Node } from '@babel/types'
import type { VineCompFnCtx, VineTemplateBindings } from '../types'
import { traverse } from '@babel/types'
import MagicString from 'magic-string'
import { babelParse } from '../babel-helpers/parse'
import { CSS_VARS_HELPER, VineBindingTypes } from '../constants'

function findIdentifierFromExp(scriptContent: string): Identifier[] {
  const identifiers: Identifier[] = []
  const ast = babelParse(scriptContent)
  traverse(ast, (node) => {
    if (node.type === 'Identifier') {
      identifiers.push(node)
    }
  })
  return identifiers
}

function genCSSVarsList(
  cssBindings: Record<string, string | null> | null,
  propsAlias: string,
  bindings: VineTemplateBindings,
  inline = false,
) {
  let res = ''
  if (cssBindings) {
    for (const cssBindScriptContent in cssBindings) {
      // get hash
      const cssBindValue = cssBindings[cssBindScriptContent]
      const ms = new MagicString(cssBindScriptContent)
      // get Identifiers
      // e.g ["(a + b) / 2 + 'px'"] -> ["a", "b"]
      const cssBindKeySgNodes = findIdentifierFromExp(cssBindScriptContent)

      cssBindKeySgNodes.forEach((node) => {
        // overwrite binding script content
        // e.g (a + b) / 2 + 'px' -> (_ctx.a + _ctx.b) / 2
        ms.overwrite(
          node.start!,
          node.end!,
          // non-inline mode only needs to rewrite the variable to `_ctx.x`
          inline
            ? genCSSVarsValue(ms, node, bindings, propsAlias)
            : `_ctx.${
              cssBindScriptContent.slice(
                node.start!,
                node.end!,
              )
            }`,
        )
      })

      res = `${res}  '${cssBindValue}': (${ms.toString()}),\n`
    }
  }

  return res
}

function genCSSVarsValue(
  ms: MagicString,
  node: Node,
  bindings: VineTemplateBindings,
  propsAlias: string,
) {
  let res = ''
  const nodeContent = ms.original.slice(
    node.start!,
    node.end!,
  )
  for (const bindingsKey in bindings) {
    const bindingValue = bindings[bindingsKey]
    if (nodeContent === bindingsKey) {
      switch (bindingValue) {
        case VineBindingTypes.PROPS:
        case VineBindingTypes.PROPS_ALIASED:
          res = `${propsAlias}.${nodeContent}`
          break
        case VineBindingTypes.SETUP_CONST:
        case VineBindingTypes.SETUP_REACTIVE_CONST:
        case VineBindingTypes.LITERAL_CONST:
          res = nodeContent
          break
        case VineBindingTypes.SETUP_MAYBE_REF:
        case VineBindingTypes.SETUP_LET:
          res = `_unref(${nodeContent})`
          break
        // The `vineProp` variable is inconsistent with vue here, and vue is `PROPS`
        // Because vine compilation will use `toRefs` processing
        case VineBindingTypes.SETUP_REF:
          res = `${nodeContent}.value`
          break
        default:
          res = `_ctx.${nodeContent}`
      }
    }
  }
  return res
}

export function compileCSSVars(
  vineCompFnCtx: VineCompFnCtx,
  inline = false,
): string {
  const {
    cssBindings,
    propsAlias,
    bindings,
  } = vineCompFnCtx
  if (!cssBindings)
    return ''
  const varList = genCSSVarsList(
    cssBindings,
    propsAlias,
    bindings,
    inline,
  )
  return `_${CSS_VARS_HELPER}(_ctx => ({\n${varList}\n}))`
}
