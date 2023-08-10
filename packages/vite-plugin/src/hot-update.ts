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
import { areStrArraysEqual } from './utils'

// HMR Strategy:
// 1. Only update style if just style changed
// 2. Only re-render current component if just template changed
// 3. Any other condition will re-render the whole module
// 4. If v-bind changes will re-render the whole module
//
// TODO: 编译 hmr 只在 dev 编译
// TODO: 更新 unit test
function reAnalyzeVine(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks) {
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId, undefined)
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)
  const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)
  doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  return vineFileCtx
}

interface PatchModuleRes {
  hmrCompFnsName: HMRCompFnsName
  type: null | 'style' | 'module'
  scopeId?: string
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
  const nOriginCode = newVFCtx.originCode
  const oOriginCode = oldVFCtx.originCode
  for (let i = 0; i < nVineCompFns.length; i++) {
    const nCompFns = nVineCompFns[i]
    const oCompFns = oVineCompFns[i]
    const nCompFnsTemplate = nCompFns.templateSource
    const oCompFnsTemplate = oCompFns.templateSource
    const nCompFnsStyle = nStyleDefine[nCompFns.scopeId].source
    const oCompFnsStyle = oStyleDefine[oCompFns.scopeId].source
    // 1. Get component function AST Node range for its code content
    const nCompFnCode = nOriginCode.substring(Number(nCompFns.fnItselfNode!.start), Number((nCompFns!.fnItselfNode!.end)))
    const oCompFnCode = oOriginCode.substring(Number(oCompFns.fnItselfNode!.start), Number((oCompFns!.fnItselfNode!.end)))
    // 2. Clean template content
    const nCompFnCodeNonTemplate = nCompFnCode.replace(nCompFnsTemplate, '')
    const oCompFnCodeNonTemplate = oCompFnCode.replace(oCompFnsTemplate, '')
    // 3. Clean style content
    const nCompFnCodePure = nCompFnCodeNonTemplate.replace(nCompFnsStyle, '')
    const oCompFnCodePure = oCompFnCodeNonTemplate.replace(oCompFnsStyle, '')
    // Compare with the remaining characters without style and template interference
    // 4. If not equal, it means that the script has changed
    if (nCompFnCodePure !== oCompFnCodePure) {
      patchRes.hmrCompFnsName = nCompFns.fnName
      newVFCtx.renderOnly = false
    }
    else if (nCompFnsTemplate !== oCompFnsTemplate) {
      // script equal, then compare template
      patchRes.hmrCompFnsName = nCompFns.fnName
      newVFCtx.renderOnly = true
    }
    else if (nCompFnsStyle !== oCompFnsStyle) {
      // script and template equal, then compare style
      const oCssBindingsVariables = Object.keys(oCompFns.cssBindings)
      const nCssBindingsVariables = Object.keys(nCompFns.cssBindings)
      // No v-bind() before and after the change
      if (oCssBindingsVariables.length === 0 && nCssBindingsVariables.length === 0) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFns.scopeId
      // The variables of v-bind() before and after the change are equal
      }
      else if (areStrArraysEqual(oCssBindingsVariables, nCssBindingsVariables)) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFns.scopeId
      }
      else {
        patchRes.type = 'module'
      }
      patchRes.hmrCompFnsName = nCompFns.fnName
      patchRes.scopeId = nCompFns.scopeId
      newVFCtx.renderOnly = false
    }
  }

  // If the number of components is different,
  // it means that the module has breaking change
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
  const orgFileContent = orgVineFileCtx.originCode

  // file changed !
  if (fileContent !== orgFileContent) {
    // analyze code again
    const vineFileCtx: VineFileCtx = reAnalyzeVine(fileContent, file, compilerHooks)

    let patchRes: PatchModuleRes | null = null
    const affectedModules = new Set<ModuleNode>()
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

    modules.forEach((m) => {
      const importedModules = m.importedModules
      if (importedModules.size > 0) {
        [...importedModules].forEach((im) => {
          if (!im.id)
            return
          const { query } = parseQuery(im.id)
          if (query.type === QUERY_TYPE_STYLE
            && patchRes
            && patchRes.type
            && patchRes.scopeId === query.scopeId
            && patchRes.hmrCompFnsName) {
            affectedModules.add(im)
          }
        })
      }
    })

    // update vineFileCtx
    patchRes && (vineFileCtx.hmrCompFnsName = (patchRes as PatchModuleRes).hmrCompFnsName)
    compilerCtx.fileCtxMap.set(file, vineFileCtx)
    compilerCtx.isRunningHMR = true

    const getFinalModules = () => {
      if (!patchRes)
        return [...modules]
      const { type } = patchRes

      if (affectedModules.size > 0) {
        if (type === 'style') {
          return [...affectedModules]
        }
        else if (type === 'module') {
          return [...modules, ...affectedModules]
        }
      }

      return [...modules]
    }
    return getFinalModules()
  }
}
