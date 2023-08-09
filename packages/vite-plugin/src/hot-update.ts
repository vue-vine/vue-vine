import type { HmrContext, ModuleNode } from 'vite'
import type {
  VineCompilerCtx,
  VineCompilerHooks,
  VineFileCtx,
} from '@vue-vine/compiler'
import {
  createVineFileCtx,
  doAnalyzeVine,
  doValidateVine,
  findVineCompFnDecls,
} from '@vue-vine/compiler'
import { QUERY_TYPE_STYLE } from './constants'
import { parseQuery } from './parse-query'

function reAnalyzeVine(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks) {
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId)
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)

  const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)

  // 1. Validate all vine restrictions
  doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)

  // 2. Analysis
  doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  return vineFileCtx
}

function isStyleChanged(
  oldVFCtx: VineFileCtx,
  newVFCtx: VineFileCtx,
  scopeId: string) {
  const oldStyleDefine = oldVFCtx.styleDefine[scopeId]
  const newStyleDefine = newVFCtx.styleDefine[scopeId]
  const keys = Object.keys(oldStyleDefine)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i] as keyof typeof oldStyleDefine
    // Compare only lang, source and scoped fields
    if (key === 'range' || key === 'fileCtx') {
      continue
    }
    if (newStyleDefine[key] !== oldStyleDefine[key]) {
      return true
    }
  }
  return false
}

export async function vineHMR(
  ctx: HmrContext,
  compilerCtx: VineCompilerCtx,
  compilerHooks: VineCompilerHooks,
) {
  const { modules, file, read } = ctx
  const fileContent = await read()
  const orgVineFileCtx = compilerCtx.fileCtxMap.get(file)!
  const orgFileContent = orgVineFileCtx.originCode

  // file changed !
  if (fileContent !== orgFileContent) {
    // analyze code again
    const vineFileCtx: VineFileCtx = reAnalyzeVine(fileContent, file, compilerHooks)

    const affectedModules = new Set<ModuleNode>()

    // patch VineFileCtx
    modules.forEach((m) => {
      const importedModules = m.importedModules
      if (importedModules.size > 0) {
        [...importedModules].forEach((im) => {
          if (!im.id)
            return
          const { query } = parseQuery(im.id)
          // filter css modules
          if (query.type === QUERY_TYPE_STYLE) {
            // Compare the old and new styles to determine
            // which style's virtual module needs to be updated
            if (isStyleChanged(orgVineFileCtx, vineFileCtx, query.scopeId)) {
              affectedModules.add(im)
            }
          }
        })
      }
    })
    // TODO: 如果是 render 部分变化则执行 render
    // TODO: 如果是 script部分变化则更新整个 module
    // TODO: 如果是 css vars v-bind 部分变化则更新整个module(需要重新编译脚本)

    // update vineFileCtx
    compilerCtx.fileCtxMap.set(file, vineFileCtx)
    return affectedModules.size > 0
      ? [...affectedModules]
      : [...modules]
  }
}
