import type {
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
} from '@vue-vine/compiler'
import { ComponentDependencyAnalyzer } from './dependency-analyzer'

const IMPORT_SEARCH_REGEX = /import\s+(?:\S.*?)??from\s+['"`]([^'"`]+)['"`]/g

export class VineHMRManager {
  private dependencyAnalyzer: ComponentDependencyAnalyzer

  constructor() {
    this.dependencyAnalyzer = new ComponentDependencyAnalyzer()
  }

  async handleHMR(
    ctx: HmrContext,
    compilerCtx: VineCompilerCtx,
    compilerHooks: VineCompilerHooks,
  ): Promise<ModuleNode[] | undefined> {
    const { file: fileId, read, modules } = ctx

    try {
      const fileContent = await read()
      const originalFileCtx = compilerCtx.fileCtxMap.get(fileId)

      // Handle non-vine files or new vine files
      if (!originalFileCtx) {
        // Check if this is a new vine file
        if (fileId.endsWith('.vine.ts')) {
          // This is a new vine file - analyze it and add it to the compiler context
          const newFileCtx = this.reanalyzeVineFile(fileContent, fileId, compilerHooks)
          compilerCtx.fileCtxMap.set(fileId, newFileCtx)
          compilerCtx.isRunningHMR = true

          // For new vine files, we need to trigger a more comprehensive update
          // Find all modules that might import this new file and invalidate them
          const affectedModules = new Set<ModuleNode>(modules)

          // Add importers that might reference this new file
          for (const module of modules) {
            if (module.importers) {
              module.importers.forEach(importer => affectedModules.add(importer))
            }
          }

          return [...affectedModules]
        }

        return this.handleNonVineFileHMR(modules, compilerCtx)
      }

      // Quick content check
      if (fileContent === originalFileCtx.originCode) {
        return
      }

      // analyze code again
      const newFileCtx = this.reanalyzeVineFile(fileContent, fileId, compilerHooks)

      let patchRes: any = null
      const affectedModules = new Set<ModuleNode>()

      // Check for new imports and handle new vine files
      const oldImports = this.extractImports(originalFileCtx.originCode)
      const newImports = this.extractImports(fileContent)
      const addedImports = newImports.filter(imp => !oldImports.includes(imp))

      if (addedImports.length > 0) {
        // Check if any of the new imports are vine files
        for (const importPath of addedImports) {
          if (importPath.endsWith('.vine')) {
            const fullPath = `${importPath}.ts`

            // Try to analyze the new file if it exists
            try {
              const fs = await import('node:fs')
              const path = await import('node:path')
              const resolvedPath = path.resolve(path.dirname(fileId), fullPath)

              if (fs.existsSync(resolvedPath)) {
                const newFileContent = fs.readFileSync(resolvedPath, 'utf-8')
                const newFileCtx = this.reanalyzeVineFile(newFileContent, resolvedPath, compilerHooks)
                compilerCtx.fileCtxMap.set(resolvedPath, newFileCtx)

                // Force Vite to add the new file to its module graph
                try {
                  const moduleGraph = ctx.server.moduleGraph
                  const fileUrl = `file://${resolvedPath}`
                  const newModule = await moduleGraph.ensureEntryFromUrl(fileUrl)
                  affectedModules.add(newModule)

                  // Update module dependencies to establish import relationship
                  for (const mainModule of modules) {
                    mainModule.importedModules.add(newModule)
                    newModule.importers.add(mainModule)
                    moduleGraph.invalidateModule(mainModule)
                    affectedModules.add(mainModule)
                  }
                }
                catch {
                  // Silently handle module graph errors
                }
              }
            }
            catch {
              // Silently handle file analysis errors
            }
          }
        }
      }

      // Mimic original implementation: only patch when script module is found
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

      // patch VineFileCtx, get patchRes - only for script modules
      const { parseQuery } = await import('../parse-query')
      const { QUERY_TYPE_SCRIPT, QUERY_TYPE_STYLE } = await import('../constants')

      forEachImportedModule((im) => {
        const { query } = parseQuery(im.id!)
        if (query.type === QUERY_TYPE_SCRIPT) {
          patchRes = patchModuleOldWay(originalFileCtx, newFileCtx)
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
        newFileCtx.hmrCompFnsName = patchRes.hmrCompFnsName
      }
      compilerCtx.fileCtxMap.set(fileId, newFileCtx)
      compilerCtx.isRunningHMR = true

      if (!patchRes) {
        // If we have new vine files, we should still return affected modules
        if (affectedModules.size > 0) {
          return [...affectedModules]
        }
        return [...modules]
      }

      const { type } = patchRes

      // If patchRes exists but type is null, and we have new vine files, still return affected modules
      if (!type && affectedModules.size > 0) {
        return [...affectedModules]
      }

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
    catch (error) {
      console.error('VineHMR Error:', error)
      return this.fallbackToFullReload(modules, compilerCtx, fileId, ctx, compilerHooks)
    }
  }

  private reanalyzeVineFile(
    code: string,
    fileId: string,
    compilerHooks: VineCompilerHooks,
  ): VineFileCtx {
    const vineFileCtx: VineFileCtx = createVineFileCtx(code, fileId, { compilerHooks })
    compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)
    const vineCompFnDecls = findVineCompFnDecls(vineFileCtx.root)
    doValidateVine(compilerHooks, vineFileCtx, vineCompFnDecls)
    doAnalyzeVine(compilerHooks, vineFileCtx, vineCompFnDecls)
    compilerHooks.onEnd?.()
    return vineFileCtx
  }

  private async handleNonVineFileHMR(
    modules: ModuleNode[],
    compilerCtx: VineCompilerCtx,
  ): Promise<ModuleNode[] | undefined> {
    // Handle imports by .vine.ts files
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

        // Use topological sort to determine update order
        const sorted = this.dependencyAnalyzer.getTopologicalOrder(importerVineFileCtx)
        if (sorted && sorted.length > 0) {
          importerVineFileCtx.hmrCompFnsName = sorted[sorted.length - 1]
          compilerCtx.isRunningHMR = true
          return [...modules, importer]
        }
      }
    }

    return undefined
  }

  private async fallbackToFullReload(
    modules: ModuleNode[],
    compilerCtx: VineCompilerCtx,
    fileId: string,
    ctx: HmrContext,
    compilerHooks: VineCompilerHooks,
  ): Promise<ModuleNode[]> {
    // Fallback to basic HMR when advanced logic fails
    try {
      const fileContent = await ctx.read()
      const newFileCtx = this.reanalyzeVineFile(fileContent, fileId, compilerHooks)

      // Force full reload
      newFileCtx.renderOnly = false
      newFileCtx.hmrCompFnsName = newFileCtx.vineCompFns[0]?.fnName || null

      compilerCtx.fileCtxMap.set(fileId, newFileCtx)
      compilerCtx.isRunningHMR = true

      return [...modules]
    }
    catch {
      return [...modules]
    }
  }

  private extractImports(code: string): string[] {
    const imports: string[] = []
    let match

    // eslint-disable-next-line no-cond-assign
    while ((match = IMPORT_SEARCH_REGEX.exec(code)) !== null) {
      imports.push(match[1])
    }

    return imports
  }
}

// Global HMR manager instance
let hmrManagerInstance: VineHMRManager | undefined

function getHMRManagerInstance(): VineHMRManager {
  if (!hmrManagerInstance) {
    hmrManagerInstance = new VineHMRManager()
  }
  return hmrManagerInstance
}

export { getHMRManagerInstance }

interface PatchRes {
  hmrCompFnsName: string | null
  type: 'style' | 'module' | null
  scopeId: string | undefined
}

// Helper method that replicates the original patchModule logic
function patchModuleOldWay(
  oldVFCtx: VineFileCtx,
  newVFCtx: VineFileCtx,
) {
  let patchRes: PatchRes = {
    hmrCompFnsName: null,
    type: null,
    scopeId: undefined,
  }

  const nVineCompFns = newVFCtx.vineCompFns
  const oVineCompFns = oldVFCtx.vineCompFns

  if (oVineCompFns.length !== nVineCompFns.length) {
    newVFCtx.renderOnly = false
    return patchRes
  }

  const oldFnNames = oVineCompFns.map(fn => fn.fnName)
  const newFnNames = nVineCompFns.map(fn => fn.fnName)

  // Helper function for array comparison (from utils)
  const areStrArraysEqual = (arr1: string[], arr2: string[]): boolean => {
    if (arr1.length !== arr2.length)
      return false
    return arr1.every((item, index) => item === arr2[index])
  }

  const normalizeLineEndings = (str: string): string => {
    return str.replace(/\r\n/g, '\n')
  }

  if (!areStrArraysEqual(oldFnNames, newFnNames)) {
    newVFCtx.renderOnly = false
    patchRes.hmrCompFnsName = newFnNames.find(name => !oldFnNames.includes(name)) || null
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

    const nCompFnTemplate = normalizeLineEndings(nCompFn.templateSource || '')
    const oCompFnTemplate = normalizeLineEndings(oCompFn.templateSource || '')
    const nCompFnStyles = nStyleDefine[nCompFn.scopeId]?.map(style => style.source ?? '') || []
    const oCompFnStyles = oStyleDefine[oCompFn.scopeId]?.map(style => style.source ?? '') || []

    // 1. Get component function AST Node range for its code content
    const nCompFnCode = nOriginCode.substring(Number(nCompFn.fnItselfNode.start), Number(nCompFn.fnItselfNode.end))
    const oCompFnCode = oOriginCode.substring(Number(oCompFn.fnItselfNode.start), Number(oCompFn.fnItselfNode.end))

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
      const oCssBindingsVariables = Object.keys(oCompFn.cssBindings || {})
      const nCssBindingsVariables = Object.keys(nCompFn.cssBindings || {})
      // No v-bind() before and after the change
      if (oCssBindingsVariables.length === 0 && nCssBindingsVariables.length === 0) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFn.scopeId
        // Pure style change - don't reload the component
        newVFCtx.renderOnly = true
      }
      // The variables of v-bind() before and after the change are equal
      else if (areStrArraysEqual(oCssBindingsVariables, nCssBindingsVariables)) {
        patchRes.type = 'style'
        patchRes.scopeId = nCompFn.scopeId
        // Style with same v-bind variables - safe to keep renderOnly
        newVFCtx.renderOnly = true
      }
      else {
        // v-bind() variables changed - need full reload
        patchRes.type = 'module'
        newVFCtx.renderOnly = false
      }
      patchRes.hmrCompFnsName = nCompFn.fnName
      patchRes.scopeId = nCompFn.scopeId
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
