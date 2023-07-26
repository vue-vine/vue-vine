import { compile } from '@vue/compiler-dom'
import type { BindingTypes, CompilerOptions } from '@vue/compiler-dom'
import type { ExportNamedDeclaration, ImportDeclaration, Node } from '@babel/types'
import { isExportNamedDeclaration, isFunctionDeclaration, isIdentifier, isImportDeclaration, isImportDefaultSpecifier, isImportSpecifier } from '@babel/types'
import type { VineCompFnCtx, VineCompilerHooks, VineFileCtx } from '../types'
import { babelParse } from '../babel-helpers/parse'
import { appendToMapArray } from '../utils'
import { vineErr } from '../diagnostics'
import { VineBindingTypes } from '../constants'

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

interface DefaultImportSpecifierMeta { type: 'defaultSpecifier'; localName: string }
interface NamespaceImportSpecifierMeta { type: 'namespaceSpecifier'; localName: string }
export interface NamedImportSpecifierMeta { type: 'namedSpecifier'; specs: Map<string, string> }
export type MergedImportsMap = Map<
  string,
  | DefaultImportSpecifierMeta
  | NamedImportSpecifierMeta
  | NamespaceImportSpecifierMeta
>

export interface TemplateCompileComposer {
  compileSetupFnReturns: (params: {
    vineFileCtx: VineFileCtx
    vineCompFnCtx: VineCompFnCtx
    templateSource: string
    mergedImportsMap: MergedImportsMap
    bindingMetadata: Record<string, BindingTypes>
  }) => string
  templateCompileResults: WeakMap<VineCompFnCtx, string>
  generatedPreambleStmts: WeakMap<VineCompFnCtx, string[]>
}

function saveImportSpecifier(
  mergedImportsMap: MergedImportsMap,
  importStmts: ImportDeclaration[],
) {
  for (const importStmt of importStmts) {
    const allImportSpecs = importStmt.specifiers
    const source = importStmt.source.value
    for (const spec of allImportSpecs) {
      if (isImportSpecifier(spec)) {
        const specName = (
          isIdentifier(spec.imported)
            ? spec.imported.name
            : spec.imported.value
        )
        const specAlias = (
          isIdentifier(spec.local)
            ? spec.local.name
            : specName
        )
        const specMeta = mergedImportsMap.get(source)
        if (!specMeta) {
          mergedImportsMap.set(
            source,
            {
              type: 'namedSpecifier',
              specs: new Map([[specName, specAlias]]),
            },
          )
        }
        else {
          (specMeta as NamedImportSpecifierMeta).specs.set(specName, specAlias)
        }
      }
      else if (isImportDefaultSpecifier(spec)) {
        mergedImportsMap.set(
          source,
          {
            type: 'defaultSpecifier',
            localName: spec.local.name,
          },
        )
      }
      else {
        mergedImportsMap.set(
          source,
          {
            type: 'namespaceSpecifier',
            localName: spec.local.name,
          },
        )
      }
    }
  }
}

function isExportRenderFnNode(node: Node): node is ExportNamedDeclaration {
  if (!isExportNamedDeclaration(node)) {
    return false
  }
  return (
    isFunctionDeclaration(node.declaration)
    && node.declaration.id?.name === 'render'
  )
}

export function createSeparatedTemplateComposer(
  compilerHooks: VineCompilerHooks,
): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineCompFnCtx, string> = new WeakMap()
  const generatedPreambleStmts: WeakMap<VineCompFnCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns: ({
      vineFileCtx,
      vineCompFnCtx: vineFnCompCtx,
      templateSource,
      mergedImportsMap,
      bindingMetadata,
    }) => {
      const compileResult = compileVineTemplate(
        templateSource,
        {
          scopeId: `data-v-${vineFnCompCtx.scopeId}`,
          bindingMetadata,
          inline: false,
        },
      )

      const { code } = compileResult
      const generatedCodeAst = babelParse(code)

      // Find all import statements and store specifiers
      saveImportSpecifier(
        mergedImportsMap,
        generatedCodeAst.program.body.filter(
          (stmt): stmt is ImportDeclaration => isImportDeclaration(stmt),
        ),
      )

      let exportRenderFnNode: Node | undefined
      for (const codeStmt of generatedCodeAst.program.body) {
        if (isImportDeclaration(codeStmt)) {
          // Skip import statements
          continue
        }
        else if (isExportRenderFnNode(codeStmt)) {
          exportRenderFnNode = codeStmt
          continue
        }
        appendToMapArray(
          generatedPreambleStmts,
          vineFnCompCtx,
          code.slice(
            codeStmt.start!,
            codeStmt.end!,
          ),
        )
      }

      if (!exportRenderFnNode) {
        compilerHooks.onError(vineErr(vineFileCtx, {
          msg: '[Vine Error] Cannot find export render function on template composing',
        }))
        return ''
      }
      templateCompileResults.set(
        vineFnCompCtx,
        code.slice(
          exportRenderFnNode.start!,
          exportRenderFnNode.end!,
        ).replace(
          'export function render',
          'function __sfc_render',
        ),
      )

      // For separate mode, the setup function's return expression
      // is combining all the bindings from user imports and all declarations.
      // non-inline mode, or has manual render in normal <script>
      // return bindings from script and script setup
      const allBindings: Record<string, any> = {
        ...bindingMetadata,
      }
      for (const key in vineFileCtx.userImports) {
        if (
          !vineFileCtx.userImports[key].isType
          && vineFileCtx.userImports[key].isUsedInTemplate
        ) {
          allBindings[key] = true
        }
      }
      let setupFnReturns = '{ '
      for (const key in allBindings) {
        if (
          allBindings[key] === true
          && vineFileCtx.userImports[key].source !== 'vue'
          && !vineFileCtx.userImports[key].source.endsWith('.vue')
        ) {
          // generate getter for import bindings
          // skip vue imports since we know they will never change
          setupFnReturns += `get ${key}() { return ${key} }, `
        }
        else if (bindingMetadata[key] === VineBindingTypes.SETUP_LET) {
          // local let binding, also add setter
          const setArg = key === 'v' ? '_v' : 'v'
          setupFnReturns
        += `get ${key}() { return ${key} }, `
        + `set ${key}(${setArg}) { ${key} = ${setArg} }, `
        }
        else if (bindingMetadata[key] === VineBindingTypes.PROPS) {
          // Skip props bindings
        }
        else {
          setupFnReturns += `${key}, `
        }
      }
      setupFnReturns = `${setupFnReturns.replace(/, $/, '')} }`
      return setupFnReturns
    },
  }
}

export function createInlineTemplateComposer(): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineCompFnCtx, string> = new WeakMap()
  const generatedPreambleStmts: WeakMap<VineCompFnCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns: ({
      vineCompFnCtx: vineFnCompCtx,
      templateSource,
      mergedImportsMap,
      bindingMetadata,
    }) => {
      const compileResult = compileVineTemplate(
        templateSource,
        {
          scopeId: `data-v-${vineFnCompCtx.scopeId}`,
          bindingMetadata,
        },
      )

      const { preamble, code } = compileResult
      const preambleAst = babelParse(preamble)
      // Find all import statements and store specifiers
      saveImportSpecifier(
        mergedImportsMap,
        preambleAst.program.body.filter(
          (stmt): stmt is ImportDeclaration => isImportDeclaration(stmt),
        ),
      )

      const preambleStmts = preambleAst.program.body.filter(
        stmt => !isImportDeclaration(stmt),
      )
      preambleStmts.forEach(stmt => appendToMapArray(
        generatedPreambleStmts,
        vineFnCompCtx,
        preamble.slice(
          stmt.start!,
          stmt.end!,
        ),
      ))

      // For inline mode, we can directly store the generated code,
      // it's an inline render function
      templateCompileResults.set(vineFnCompCtx, code)

      // For inline mode, the setup function's return expression is the render function
      return code
    },
  }
}
