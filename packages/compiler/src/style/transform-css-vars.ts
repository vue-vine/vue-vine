import type { SgNode } from '@ast-grep/napi'
import type { VineFnCompCtx, VinePropMeta } from '../types'
import { ruleDestructuredAlias, ruleSetupVariableDeclaration } from '../ast-grep/rules-for-script'
import { spaces } from '../utils'

export const CSS_VARS_HELPER = 'useCssVars'
function genUseCssVarsCode(varList: string) {
  return `_${CSS_VARS_HELPER}(_ctx => {
    console.log(_ctx)
    return ({
${varList}
})
  })`
}

/* function genCSSVarsItem(
  node: SgNode,
  name: string,
  value: string,
) {
  let res = ''
  let varName = ''
  const matchRes = node.find(ruleSetupVariableDeclaration)
  if (!matchRes) {
    return ''
  }

  switch (matchRes.kind()) {
    case 'variable_declarator':
      varName = matchRes.field('name')!.text()
      break
    case 'pair_pattern':
      varName = matchRes.field('key')!.text()
      break
  }

  if (name !== varName) {
    return ''
  }

  // e.g. const foo = ref('foo')
  if (node.find(ruleHasVueRefCallExpr)) {
    if (matchRes) {
      res = `${spaces(2)}'${value}': (ctx.${varName}),\n`
    }
  }
  // e.g. const foo = 'foo'
  else if (matchRes) {
    res = `${spaces(2)}'${value}': (ctx.${varName}),\n`
  }
  return res
}

function genCSSVarsItemProps(
  propName: string,
  name: string,
  value: string,
  propsAlias: string,
) {
  const propsAliasValue = `${propsAlias}.${propName}`
  const isPropNameEqualName = propName === name
  if (isPropNameEqualName) {
    // e.g: color <-> props.color
    return `${spaces(2)}'${value}': (${propsAliasValue}),\n`
  }
  else if (propsAliasValue === name) {
    // e.g: props.color <-> props.color
    // e.g: alias_props.color <-> alias_props.color
    return `${spaces(2)}'${value}': (${name}),\n`
  }
  else {
    return ''
  }
}

// 普通变量从 ctx 中获取
// ref 变量带 value
// reactive 变量 不变
// props 变量带 props
// const { color: {color: color2}} = a => unref(color2)
// 别名 都用 unref 包裹 const { color: fff } = a =》 (_unref(fff).color)
function genCSSVarsList(
  cssBindings: Record<string, string | null> | null,
  setupStmts: SgNode[],
  props: Record<string, VinePropMeta>,
  propsAlias: string,
) {
  let res = ''
  if (cssBindings) {
    for (const cssBindKey in cssBindings) {
      const cssBindValue = cssBindings[cssBindKey]
      let varRes = ''
      // look for from setup variable
      for (let i = 0; i < setupStmts.length; i++) {
        varRes = genCSSVarsItem(setupStmts[i], cssBindKey, cssBindValue || '')
        if (varRes)
          break
      }
      // look for from props variable
      if (!varRes) {
        for (const key in props) {
          varRes = genCSSVarsItemProps(key, cssBindKey, cssBindValue || '', propsAlias)
          if (varRes)
            break
        }
      }

      res = `${res}${varRes}`
    }
  }

  return res
} */

function genCSSVarsItemNonInline(
  node: SgNode,
  name: string,
  value: string,
) {
  let res = ''
  let varName = ''
  const matchRes = node.find(ruleSetupVariableDeclaration)
  if (!matchRes) {
    return ''
  }

  function handleVariableDecarator(matchRes: SgNode) {
    const keyNameSgNode = matchRes.field('name')
    const destructuredAlias = keyNameSgNode!.findAll(ruleDestructuredAlias)
    if (destructuredAlias.length === 0) {
      varName = keyNameSgNode!.text()
    }
    else {
      destructuredAlias.some((node) => {
        if (node.text() === name || name.startsWith(node.text())) {
          varName = name
          return true
        }
        return false
      })
    }
  }

  switch (matchRes.kind()) {
    case 'variable_declarator':
      handleVariableDecarator(matchRes)
      break
    case 'pair_pattern':
      varName = matchRes.field('key')!.text()
      break
  }

  if (name !== varName) {
    return ''
  }

  if (matchRes) {
    res = `${spaces(2)}'${value}': (_ctx.${name}),\n`
  }

  return res
}

function genCSSVarsItemPropsNonInline(
  propName: string,
  name: string,
  value: string,
) {
  const isPropNameEqualName = propName === name
  if (isPropNameEqualName) {
    // e.g: color <-> props.color
    return `${spaces(2)}'${value}': (_ctx.${propName}),\n`
  }
  else {
    return ''
  }
}

function genCSSVarsListNonInline(
  cssBindings: Record<string, string | null> | null,
  setupStmts: SgNode[],
  props: Record<string, VinePropMeta>,
) {
  let res = ''
  if (cssBindings) {
    for (const cssBindKey in cssBindings) {
      const cssBindValue = cssBindings[cssBindKey]
      let varRes = ''
      // look for from props variable
      for (const key in props) {
        varRes = genCSSVarsItemPropsNonInline(key, cssBindKey, cssBindValue || '')
        if (varRes)
          break
      }

      // look for from setup variable
      if (!varRes) {
        for (let i = 0; i < setupStmts.length; i++) {
          varRes = genCSSVarsItemNonInline(setupStmts[i], cssBindKey, cssBindValue || '')
          if (varRes)
            break
        }
      }

      res = `${res}${varRes}`
    }
  }

  return res
}

export function compileCSSVars(vineFnCompCtx: VineFnCompCtx, inline = false) {
  const { cssBindings, setupStmts, props, propsAlias } = vineFnCompCtx
  if (!cssBindings)
    return ''
  const varList = !inline ? genCSSVarsListNonInline(cssBindings, setupStmts, props) : ''
  return genUseCssVarsCode(varList)
}
