import type { SgNode } from '@ast-grep/napi'
import { html, ts } from '@ast-grep/napi'
import { templateInterplationRule, templateScriptAttrsRule } from '../ast-grep/rules-for-template'

const { parse: parseHTML } = html
const { parse: parseTS } = ts

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

function findTemplateAllScriptSgNode(template: string) {
  const templateAst = parseHTML(template.trim()).root()
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
    const tsAst = parseTS(concatedVirtualScript).root()
    return tsAst
  }
  catch (error) {
    return null
  }
}

export function findTemplateAllIdentifiers(template: string) {
  const tsAst = findTemplateAllScriptSgNode(template)
  if (!tsAst) {
    return []
  }
  const allIdentifiers = tsAst.findAll(ts.kind('identifier'))
  return allIdentifiers
}
