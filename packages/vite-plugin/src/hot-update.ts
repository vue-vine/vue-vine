import type {
  ComponentRelationsMap,
  HMRCompFnsName,
  VineCompilerCtx,
  VineCompilerHooks,
  VineFileCtx,
} from '@vue-vine/compiler'
import type { HmrContext, ModuleNode } from 'vite'
import {
  createVineFileCtx,
  doAnalyzeVine,
  doValidateVine,
  findVineCompFnDecls,
  topoSort,
} from '@vue-vine/compiler'
import { QUERY_TYPE_SCRIPT, QUERY_TYPE_STYLE } from './constants'
import { parseQuery } from './parse-query'
import { areStrArraysEqual, normalizeLineEndings } from './utils'

// HMR Strategy:
// 1. Only update style if just style changed
// 2. Only re-render current component if just template changed
// 3. Any other condition will re-render the whole module
// 4. If v-bind changes will re-render the whole module

function reAnalyzeVine(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks,
) {
  const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId, { compilerHooks })
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)
  const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)
  doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)
  compilerHooks.onEnd?.()
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
  const nOriginCode = normalizeLineEndings(newVFCtx.originCode)
  const oOriginCode = normalizeLineEndings(oldVFCtx.originCode)
  for (let i = 0; i < nVineCompFns.length; i++) {
    const nCompFn = nVineCompFns[i]
    const oCompFn = oVineCompFns[i]
    if (
      (!oCompFn || !nCompFn)
      || (!oCompFn.fnItselfNode || !nCompFn.fnItselfNode)
    ) {
      continue
    }

    const nCompFnTemplate = normalizeLineEndings(nCompFn.templateSource)
    const oCompFnTemplate = normalizeLineEndings(oCompFn.templateSource)
    const nCompFnStyles = nStyleDefine[nCompFn.scopeId]?.map(style => style.source ?? '')
    const oCompFnStyles = oStyleDefine[oCompFn.scopeId]?.map(style => style.source ?? '')
    // 1. Get component function AST Node range for its code content
    const nCompFnCode = nOriginCode.substring(Number(nCompFn.fnItselfNode.start), Number((nCompFn.fnItselfNode!.end)))
    const oCompFnCode = oOriginCode.substring(Number(oCompFn.fnItselfNode.start), Number((oCompFn.fnItselfNode!.end)))
    // 2. Clean template content
    const nCompFnCodeNonTemplate = nCompFnCode.replace(nCompFnTemplate, '')
    const oCompFnCodeNonTemplate = oCompFnCode.replace(oCompFnTemplate, '')
    // 3. Clean style content
    let nCompFnCodePure = nCompFnCodeNonTemplate
    nCompFnStyles?.forEach((style) => {
      nCompFnCodePure = nCompFnCodePure.replace(style, '')
    })
    let oCompFnCodePure = oCompFnCodeNonTemplate
    oCompFnStyles?.forEach((style) => {
      oCompFnCodePure = oCompFnCodePure.replace(style, '')
    })

    // Compare with the remaining characters without style and template interference
    // 4. If not equal, it means that the script has changed
    if (nCompFnCodePure !== oCompFnCodePure) {
      patchRes.hmrCompFnsName = nCompFn.fnName
      newVFCtx.renderOnly = false
    }
    else if (nCompFnTemplate !== oCompFnTemplate) {
      // script equal, then compare template
      patchRes.hmrCompFnsName = nCompFn.fnName
      newVFCtx.renderOnly = true
    }
    else if (!areStrArraysEqual(nCompFnStyles, oCompFnStyles)) {
      // script and template equal, then compare style
      const oCssBindingsVariables = Object.keys(oCompFn.cssBindings)
      const nCssBindingsVariables = Object.keys(nCompFn.cssBindings)
      // No v-bind() before and after the change
      if (oCssBindingsVariables.length === 0 && nCssBindingsVariables.length === 0) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFn.scopeId
      }
      // The variables of v-bind() before and after the change are equal
      else if (areStrArraysEqual(oCssBindingsVariables, nCssBindingsVariables)) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFn.scopeId
      }
      else {
        patchRes.type = 'module'
      }
      patchRes.hmrCompFnsName = nCompFn.fnName
      patchRes.scopeId = nCompFn.scopeId
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
function patchVineFile(
  compilerCtx: VineCompilerCtx,
  compilerHooks: VineCompilerHooks,
  originVineFileCtx: VineFileCtx,
  modules: ModuleNode[],
  fileId: string,
  fileContent: string,
) {
  // Nothing changed!
  if (fileContent === originVineFileCtx.originCode) {
    return
  }

  // analyze code again
  const newVineFileCtx: VineFileCtx = reAnalyzeVine(fileContent, fileId, compilerHooks)

  let patchRes: PatchModuleRes | null = null
  const affectedModules = new Set<ModuleNode>()

  const forEachImportedModule = (
    action: (importedModule: ModuleNode) => void,
  ) => {
    modules.forEach((m) => {
      const importedModules = m.importedModules
      if (importedModules.size > 0) {
        [...importedModules].forEach((im) => {
          if (!im.id) {
            return
          }

          action(im)
        })
      }
    })
  }

  // patch VineFileCtx, get patchRes
  forEachImportedModule((im) => {
    const { query } = parseQuery(im.id!)
    if (query.type === QUERY_TYPE_SCRIPT) {
      patchRes = patchModule(originVineFileCtx, newVineFileCtx)
    }
  })

  // find affected modules
  forEachImportedModule((im) => {
    const { query } = parseQuery(im.id!)
    if (query.type === QUERY_TYPE_STYLE
      && patchRes?.type
      && patchRes.scopeId === query.scopeId
      && patchRes.hmrCompFnsName
    ) {
      affectedModules.add(im)
    }
  })

  // update vineFileCtx
  if (patchRes) {
    newVineFileCtx.hmrCompFnsName = (patchRes as PatchModuleRes).hmrCompFnsName
  }
  compilerCtx.fileCtxMap.set(fileId, newVineFileCtx)
  compilerCtx.isRunningHMR = true

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

export async function vineHMR(
  ctx: HmrContext,
  compilerCtx: VineCompilerCtx,
  compilerHooks: VineCompilerHooks,
) {
  const { modules, file: fileId, read } = ctx
  const fileContent = await read()

  const originVineFileCtx = compilerCtx.fileCtxMap.get(fileId)
  if (originVineFileCtx) {
    return patchVineFile(
      compilerCtx,
      compilerHooks,
      originVineFileCtx,
      modules,
      fileId,
      fileContent,
    )
  }

  // Maybe current changed modules are not `.vine.ts`,
  // but maybe they are imported by `.vine.ts` modules
  for (const mod of modules) {
    const vineImporters = [...mod.importers].filter(im => im.id?.endsWith('.vine.ts'))
    if (!vineImporters.length) {
      return
    }

    for (const importer of vineImporters) {
      const importerVineFileCtx = compilerCtx.fileCtxMap.get(importer.id!)
      if (!importerVineFileCtx) {
        continue
      }

      // Topo sort all components in this vineFileCtx,
      // but components in this file may be depended by each other,
      // and __VUE_HMR_RUNTIME__.rerender() can just re-render one component at a time,
      // so we need to use topo sort, it calculates the dependency relationship,
      // the last item means it depends on other components,
      const { vineCompFns } = importerVineFileCtx
      const relationsMap: ComponentRelationsMap = Object.fromEntries(
        vineCompFns.map(
          compFnCtx => [compFnCtx.fnName, new Set<string>()],
        ),
      )
      const sorted = topoSort(relationsMap)
      if (!sorted) {
        continue
      }

      importerVineFileCtx.hmrCompFnsName = sorted[sorted.length - 1]!
      compilerCtx.isRunningHMR = true
      return [...modules, importer]
    }
  }
}
