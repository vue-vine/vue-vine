import type { HmrContext, ModuleNode } from 'vite'
import type {
  HMRCompFnsName,
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
import { QUERY_TYPE_SCRIPT, QUERY_TYPE_STYLE } from './constants'
import { parseQuery } from './parse-query'

// 1.如果是 style 部分变化则执行更新 style
// 2.如果是 template 部分变化则执行 render
// 3.其他情况则更新整个module
// TODO: 如果是 css vars 更新整个module(需要重新编译脚本)
// TODO: 编译 hmr 只在 dev 编译，且要把所有的组件函数导出
// TODO: 更新 unit test

function reAnalyzeVine(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks) {
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId, undefined)
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)

  const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)

  // 1. Validate all vine restrictions
  doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)

  // 2. Analysis
  doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  return vineFileCtx
}

interface PatchModuleRes {
  hmrCompFnsName: HMRCompFnsName
  type: null | 'style'
}
function patchModule(
  oldVFCtx: VineFileCtx,
  newVFCtx: VineFileCtx,
) {
  let patchRes: PatchModuleRes = {
    hmrCompFnsName: null,
    type: null,
  }
  const nVineCompFns = newVFCtx.vineCompFns
  const oVineCompFns = oldVFCtx.vineCompFns
  if (oVineCompFns.length !== nVineCompFns.length) {
    newVFCtx.renderOnly = false
    return patchRes
  }

  const nStyleDefine = newVFCtx.styleDefine
  const oStyleDefine = oldVFCtx.styleDefine
  const nOriginCode = newVFCtx.fileSourceCode.original
  const oOriginCode = oldVFCtx.fileSourceCode.original
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
      patchRes.hmrCompFnsName = nCompFns.fnName
      newVFCtx.renderOnly = false
    }
    else if (nCompFnsTemplate !== oCompFnsTemplate) {
      // 否則的話，如果 template 不相等
      patchRes.hmrCompFnsName = nCompFns.fnName
      newVFCtx.renderOnly = true
    }
    else if (nCompFnsStyle !== oCompFnsStyle) {
      console.log(nCompFnsStyle)
      console.log(oCompFnsStyle)
      // 否則的話，如果 style 不相等
      patchRes.hmrCompFnsName = nCompFns.fnName
      patchRes.type = 'style'
      newVFCtx.renderOnly = false
    }
  }

  // 如果script数量等于  VineCompFns 数量，则直接返回全量更新
  if (oVineCompFns.length !== nVineCompFns.length) {
    patchRes.hmrCompFnsName = null
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
  const orgVineFileCtx = compilerCtx.fileCtxMap.get(file)
  if (!orgVineFileCtx)
    return
  const orgFileContent = orgVineFileCtx.fileSourceCode.original

  // file changed !
  if (fileContent !== orgFileContent) {
    // analyze code again
    const vineFileCtx: VineFileCtx = reAnalyzeVine(fileContent, file, compilerHooks)

    let patchRes: PatchModuleRes | null = null
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
            && patchRes.hmrCompFnsName) {
            affectedModules.add(im)
          }
        })
      }
    })

    // update vineFileCtx
    patchRes && (vineFileCtx.hmrCompFnsName = (patchRes as PatchModuleRes).hmrCompFnsName)
    compilerCtx.fileCtxMap.set(file, vineFileCtx)
    compilerCtx.isHMRing = true

    return affectedModules.size > 0
      ? [...affectedModules]
      : [...modules]
  }
}
