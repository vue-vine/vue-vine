import type { SgNode } from '@ast-grep/napi'
import { html, ts } from '@ast-grep/napi'
import { templateInterplationRule, templateScriptAttrsRule } from '../ast-grep/rules-for-template'

function processScriptForAttr(scriptTexts: string[], attrNode: SgNode) {
  const attrValueText = attrNode.find(html.kind('attribute_value'))?.text()
  if (!attrValueText) {
    return
  }
  scriptTexts.push(attrValueText)
}

function processScriptForInterpolation(scriptTexts: string[], interpolationTextNode: SgNode) {
  const text = interpolationTextNode.text()
  const start = text.indexOf('{{') + 2
  const end = text.lastIndexOf('}}')
  scriptTexts.push(text.slice(start, end).trim())
}

export function findTemplateAllScriptSgNode(templateAst: SgNode) {
  const allScriptAttrs = templateAst.findAll(templateScriptAttrsRule)
  const allInterpolations = templateAst.findAll(templateInterplationRule)

  const scriptTexts: string[] = []
  allScriptAttrs.forEach(attrNode => processScriptForAttr(
    scriptTexts,
    attrNode),
  )
  allInterpolations.forEach(interpolationTextNode => processScriptForInterpolation(
    scriptTexts,
    interpolationTextNode),
  )

  const concatedVirtualScript = scriptTexts
    .map(scriptText => `\n;(${scriptText})\n`)
    .join('\n')
    .trim()

  try {
    const tsAst = ts.parse(concatedVirtualScript).root()
    return tsAst
  }
  catch (error) {
    return null
  }
}

export function findMatchedTagName(
  templateAst: SgNode,
  names: string[],
) {
  const matchedTagNameNodes = templateAst.findAll({
    rule: {
      kind: 'tag_name',
      regex: `(${names.join('|')})`,
    },
  })
  return matchedTagNameNodes.map(node => node.text())
}

export function findTemplateAllIdentifiers(templateAst: SgNode) {
  const tsAst = findTemplateAllScriptSgNode(templateAst)
  if (!tsAst) {
    return []
  }
  const allIdentifiers = tsAst.findAll(ts.kind('identifier'))
  return allIdentifiers
}
