import type { SgNode } from '@ast-grep/napi'
import { html, ts } from '@ast-grep/napi'
import { templateInterplationRule, templateScriptAttrsRule } from '../ast-grep/rules-for-template'

const { parse: parseHTML } = html
const { parse: parseTS } = ts

function processScriptForAttr(attrNode: SgNode) {
  // Todo ...
}

function processScriptForInterpolation(interpolationTextNode: SgNode) {
  // Todo ...
}

function findTemplateAllScriptSgNode(template: string) {
  const templateAst = parseHTML(template).root()
  const allScriptAttrs = templateAst.findAll(templateScriptAttrsRule)
  const allInterpolations = templateAst.findAll(templateInterplationRule)
}
