import type { HmrContext, ModuleNode } from 'vite'
import type {
  VineCompilerCtx,
  VineCompilerHooks,
  VineFileCtx,
  VineFnCompCtx,
  HMRPatchModule,
} from '@vue-vine/compiler'
import {
  createVineFileCtx,
  doAnalyzeVine,
  doValidateVine,
  findVineCompFnDecls,
} from '@vue-vine/compiler'
import { QUERY_TYPE_SCRIPT, QUERY_TYPE_STYLE } from './constants'
import { parseQuery } from './parse-query'

// 1.如果是 style 部分变化则执行更新 style
// TODO: 2.如果是 tempalte 部分变化则执行 render
// TODO: 3.其他情况则更新整个module
// TODO: 4.如果是 css vars 更新整个module(需要重新编译脚本)

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

function patchModule(
  oldVFCtx: VineFileCtx,
  newVFCtx: VineFileCtx,
) {
  const patchRes: HMRPatchModule = {
    type: 'module',
    hrmCompFns: null,
  }
  const setPatchRes = (
    nCompFns: VineFnCompCtx,
    type: 'module' | 'style' | 'template' | 'script') => {
    patchRes.type = type
    !patchRes.hrmCompFns && (patchRes.hrmCompFns = {})
    patchRes.hrmCompFns[nCompFns.scopeId] = nCompFns.fnName
  }
  const nVineCompFns = newVFCtx.vineCompFns
  const oVineCompFns = oldVFCtx.vineCompFns
  if (oVineCompFns.length !== nVineCompFns.length) {
    patchRes.type = 'module'
    newVFCtx.renderOnly = false
    return patchRes
  }

  const nStyleDefine = newVFCtx.styleDefine
  const oStyleDefine = oldVFCtx.styleDefine
  const nOriginCode = newVFCtx.originCode
  const oOriginCode = oldVFCtx.originCode
  for (let i = 0; i < nVineCompFns.length; i++) {
    const nCompFns = nVineCompFns[i]
    const oCompFns = oVineCompFns[i]
    const nCompFnsTemplate = nCompFns.templateSource
    const oCompFnsTemplate = oCompFns.templateSource
    const nCompFnsStyle = nStyleDefine[nCompFns.scopeId].source
    const oCompFnsStyle = oStyleDefine[oCompFns.scopeId].source
    // 1.获取 CompFn 的内容
    const nCompFnCode = nOriginCode.substring(Number(nCompFns.fnItselfNode!.start), Number((nCompFns!.fnItselfNode!.end)))
    const oCompFnCode = oOriginCode.substring(Number(oCompFns.fnItselfNode!.start), Number((oCompFns!.fnItselfNode!.end)))
    // 2.清除掉 template 内容
    const nCompFnCodeNonTemplate = nCompFnCode.replace(nCompFnsTemplate, '')
    const oCompFnCodeNonTemplate = oCompFnCode.replace(oCompFnsTemplate, '')
    // 3.清除掉 style 内容
    const nCompFnCodePure = nCompFnCodeNonTemplate.replace(nCompFnsStyle, '')
    const oCompFnCodePure = oCompFnCodeNonTemplate.replace(oCompFnsStyle, '')
    // 在没有 style 和 template 干扰情况下对比剩余字符，不相等
    // 4. 不相等，这说明 script 发生变化
    if (nCompFnCodePure !== oCompFnCodePure) {
      patchRes.type = 'script'
      setPatchRes(nCompFns, 'script')
      newVFCtx.renderOnly = false
    }
    else if (nCompFnsTemplate !== oCompFnsTemplate) {
      // 否則的話，如果 template 不相等
      patchRes.type = 'template'
      setPatchRes(nCompFns, 'template')
      newVFCtx.renderOnly = true
    }
    else if (nCompFnsStyle !== oCompFnsStyle) {
      // 否則的話，如果 style 不相等
      patchRes.type = 'style'
      setPatchRes(nCompFns, 'style')
      newVFCtx.renderOnly = false
    }
  }

  // 如果script数量等于  VineCompFns 数量，则直接返回全量更新
  if (oVineCompFns.length !== nVineCompFns.length) {
    patchRes.type = 'module'
    patchRes.hrmCompFns = null
    newVFCtx.renderOnly = false
    return patchRes
  }

  return patchRes
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

    let patchRes: null | HMRPatchModule = null
    // patch VineFileCtx
    modules.forEach((m) => {
      const importedModules = m.importedModules
      if (importedModules.size > 0) {
        [...importedModules].forEach((im) => {
          if (!im.id)
            return
          const { query } = parseQuery(im.id)
          if (query.type === QUERY_TYPE_SCRIPT) {
            patchRes = patchModule(orgVineFileCtx, vineFileCtx)
          }
        })
      }
    })

    const affectedModules = new Set<ModuleNode>()
    modules.forEach((m) => {
      const importedModules = m.importedModules
      if (importedModules.size > 0) {
        [...importedModules].forEach((im) => {
          if (!im.id)
            return
          const { query } = parseQuery(im.id)
          if (query.type === QUERY_TYPE_STYLE
            && patchRes
            && patchRes.type === 'style'
            && patchRes.hrmCompFns
            && patchRes.hrmCompFns[query.scopeId]) {
            affectedModules.add(im)
          }
        })
      }
    })

    // update vineFileCtx
    patchRes && (vineFileCtx.hmrPatchModule = patchRes)
    compilerCtx.fileCtxMap.set(file, vineFileCtx)

    return affectedModules.size > 0
      ? [...affectedModules]
      : [...modules]
  }
}
