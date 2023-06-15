import type { CompilerOptions } from '@vue/compiler-dom'
import { BindingTypes, compile } from '@vue/compiler-dom'
import type { SgNode } from '@ast-grep/napi'
import { html, ts } from '@ast-grep/napi'
import type { VineFileCtx, VineFnCompCtx } from '../types'
import { ruleImportSpecifier, ruleImportStmt } from '../ast-grep/rules-for-script'
import { dedupe } from '../utils'
import { findMatchedTagName, findTemplateAllIdentifiers } from './parse'

export function compileVineTemplate(
  source: string,
  params: Partial<CompilerOptions>,
) {
  return compile(source, {
    mode: 'module',
    hoistStatic: true,
    cacheHandlers: true,
    isTS: true,
    inline: true,
    ...params,
  })
}

export interface TemplateCompileComposer {
  runTemplateCompile: (params: {
    vineFileCtx: VineFileCtx
    vineFnCompCtx: VineFnCompCtx
    generatedImportsMap: Map<string, Map<string, string>>
    templateSource: string
    allBindings: {
      scriptBindings: Record<string, BindingTypes>
      fileSharedCompBindings: Record<string, BindingTypes>
    }
  }) => string // this returned string is corresponding setup function's return expression
  templateCompileResults: WeakMap<VineFnCompCtx, string>
  notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]>
}

function storeImportSpecifiers(
  generatedImportsMap: Map<string, Map<string, string>>,
  importStmts: SgNode[],
) {
  for (const importStmt of importStmts) {
    const allImportSpecs = importStmt.findAll(ruleImportSpecifier)
    const source = importStmt.field('source')!.text().slice(1, -1) // remove quotes
    for (const importSpec of allImportSpecs) {
      const importName = importSpec.field('name')!
      const importAlias = importSpec.field('alias')
      const specPairs = generatedImportsMap.get(source)
      if (!specPairs) {
        const newSpecPairs = new Map<string, string>()
        newSpecPairs.set(
          importName.text(),
          importAlias?.text() ?? importName.text(),
        )
        generatedImportsMap.set(
          source,
          newSpecPairs,
        )
      }
      else {
        specPairs.set(
          importName.text(),
          importAlias?.text() ?? importName.text(),
        )
      }
    }
  }
}

function appendToStoreMap<K extends object, V>(
  storeMap: WeakMap<K, V[]>,
  key: K,
  value: V,
) {
  storeMap.set(
    key,
    [
      ...(storeMap.get(key) ?? []),
      value,
    ],
  )
}

export function createInlineTemplateComposer(): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineFnCompCtx, string> = new WeakMap()
  const notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    notImportPreambleStmtStore,
    runTemplateCompile: ({
      vineFnCompCtx,
      generatedImportsMap,
      templateSource,
      allBindings,
    }) => {
      const compileResult = compileVineTemplate(
        templateSource,
        {
          scopeId: `data-v-${vineFnCompCtx.scopeId}`,
          bindingMetadata: {
            ...allBindings.scriptBindings,
            ...allBindings.fileSharedCompBindings,
          },
        },
      )

      const { preamble } = compileResult
      const preambleSgRoot = ts.parse(preamble).root()
      const allImportStmts = preambleSgRoot.findAll(ruleImportStmt)
      storeImportSpecifiers(generatedImportsMap, allImportStmts)

      const allOtherStmts = preambleSgRoot.children().filter(
        child => child.kind() !== 'import_statement',
      )
      allOtherStmts.forEach(stmt => appendToStoreMap(
        notImportPreambleStmtStore,
        vineFnCompCtx,
        stmt.text(),
      ))

      // For inline mode, we can directly store the generated code,
      // it's an inline render function
      templateCompileResults.set(vineFnCompCtx, compileResult.code)

      // For inline mode, the setup function's return expression is the render function
      return compileResult.code
    },
  }
}

export function createSeparateTemplateComposer(): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineFnCompCtx, string> = new WeakMap()
  const notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]> = new WeakMap()

  const isExportRenderFn = (stmt: SgNode) => {
    if (stmt.kind() !== 'export_statement') {
      return false
    }
    return stmt.field('declaration')?.field('name')?.text() === 'render'
  }

  return {
    templateCompileResults,
    notImportPreambleStmtStore,
    runTemplateCompile: ({
      vineFileCtx,
      vineFnCompCtx,
      generatedImportsMap,
      templateSource,
      allBindings,
    }) => {
      const bindingMetadata = {
        ...allBindings.scriptBindings,
        ...allBindings.fileSharedCompBindings,
      }
      const compileResult = compileVineTemplate(
        templateSource,
        {
          inline: false,
          scopeId: `data-v-${vineFnCompCtx.scopeId}`,
          bindingMetadata,
        },
      )
      const { code } = compileResult
      const codeSgRoot = ts.parse(code).root()

      // Find all import statements and store specifiers
      const allImportStmts = codeSgRoot.findAll(ruleImportStmt)
      storeImportSpecifiers(generatedImportsMap, allImportStmts)

      // Find all other statements
      let exportRenderFnNode: SgNode | undefined
      const allOtherStmts = codeSgRoot.children().filter(
        (child) => {
          if (child.kind() === 'import_statement') {
            return false
          }
          else if (isExportRenderFn(child)) {
            exportRenderFnNode = child
            return false
          }
          return true
        },
      )
      allOtherStmts.forEach(stmt => appendToStoreMap(
        notImportPreambleStmtStore,
        vineFnCompCtx,
        stmt.text(),
      ))

      if (!exportRenderFnNode) {
        throw new Error('[Vine Error] Cannot find export render function on template composing')
      }
      templateCompileResults.set(
        vineFnCompCtx,
        exportRenderFnNode.text()
          .replace(
            'export function render',
            'function __sfc_render',
          ),
      )

      // For separate mode, the setup function's return expression
      // is combining all the bindings from user imports and all declarations.
      let setupFnReturns = '{ '
      const templateUsedImportSymbol = Symbol('templateUsedImportSymbol')
      const allReturnBindings: Record<string, BindingTypes | symbol> = {
        ...allBindings.scriptBindings,
      }
      const templateAst = html.parse(templateSource).root()

      // Find out all the import specifiers which are used in the template.
      const returnBindingSet = new Set<string>()
      const allIdentifiers = dedupe(findTemplateAllIdentifiers(templateAst).map(idNode => idNode.text()))
      for (const id of allIdentifiers) {
        const importSpecifier = vineFileCtx.userImports[id]
        if (importSpecifier && !importSpecifier.isType) {
          allReturnBindings[id] = templateUsedImportSymbol
        }
      }
      for (const key of Object.keys(allReturnBindings)) {
        if (
          allReturnBindings[key] === templateUsedImportSymbol
          && vineFileCtx.userImports[key].source !== 'vue'
          && !vineFileCtx.userImports[key].source.endsWith('.vue')
        ) {
          // generate getter for import bindings
          // skip vue imports since we know they will never change
          setupFnReturns += `get ${key}() { return ${key} }, `
        }
        else if (bindingMetadata[key] === BindingTypes.SETUP_LET) {
          // local let binding, also add setter
          const setArg = key === 'v' ? '_v' : 'v'
          setupFnReturns
            += `get ${key}() { return ${key} }, `
            + `set ${key}(${setArg}) { ${key} = ${setArg} }, `
        }
        else if (bindingMetadata[key] === BindingTypes.PROPS) {
          // skip props binding
        }
        else {
          setupFnReturns += `${key}, `
        }
        returnBindingSet.add(key)
      }

      // Find out if there are any tagName is component name, which is defined in current file.
      // If so, we need to add it to the return bindings.
      const allUsedCompTagNames = dedupe(
        findMatchedTagName(
          templateAst,
          [
            ...Object.keys(allBindings.fileSharedCompBindings),
            ...Object.keys(vineFileCtx.userImports).filter(
              importId => !vineFileCtx.userImports[importId].isType,
            ),
          ],
        ),
      )
      for (const tagName of allUsedCompTagNames) {
        if (!returnBindingSet.has(tagName)) {
          setupFnReturns += `${tagName}, `
          returnBindingSet.add(tagName)
        }
      }

      setupFnReturns = `${setupFnReturns.replace(/, $/, '')} }`
      return setupFnReturns
    },
  }
}
