import type { SourceLocation as BabelSourceLocation, ExportNamedDeclaration, ImportDeclaration, Node } from '@babel/types'
import type { AttributeNode, BindingTypes, CompilerOptions, NodeTransform, CodegenResult as VDOMCodegenResult, SourceLocation as VueSourceLocation } from '@vue/compiler-dom'
import type { CompilerOptions as CompilerOptionsVapor, VaporCodegenResult } from '@vue/compiler-vapor'
import type { VineCompFnCtx, VineCompilerHooks, VineCompilerOptions, VineFileCtx } from '../types'
import { isExportNamedDeclaration, isFunctionDeclaration, isIdentifier, isImportDeclaration, isImportDefaultSpecifier, isImportSpecifier } from '@babel/types'
import { compile as compileVDOM, ElementTypes, NodeTypes, parse } from '@vue/compiler-dom'
import { compile as ssrCompile } from '@vue/compiler-ssr'
import { compile as compileVapor } from '@vue/compiler-vapor'
import lineColumn from 'line-column'
import { babelParse } from '../babel-helpers/parse'
import { VineBindingTypes } from '../constants'
import { vineErr, vineWarn } from '../diagnostics'
import { appendToMapArray } from '../utils'
import { transformAssetUrl } from './transform-asset-url'
import { transformBooleanProp } from './transform-negative-bool'
import { walkVueTemplateAst } from './walk'

const SHOULD_ADD_SUFFIX_REGEXP = /(?<=<[^>/]+)$/

function toPascalCase(str: string) {
  return str.replace(/(?:^|-)(\w)/g, (_, c) => c.toUpperCase())
}
function getTransformNegativeBoolPlugin(
  transformNegativeBool: Required<VineCompilerOptions>['vueCompilerOptions']['__transformNegativeBool'],
): NodeTransform[] {
  if (typeof transformNegativeBool === 'object') {
    return [transformBooleanProp({ constType: transformNegativeBool.constType })]
  }

  return [transformBooleanProp()]
}

export function postProcessForRenderCodegen(codegen: string): string {
  return codegen
    // https://github.com/vue-vine/vue-vine/issues/171
    // Replace all `= _resolveComponent('...')`, '...' is the component name,
    // to `= (typeof <toPascalCase('...')> === 'undefined' ? _resolveComponent('...') : <toPascalCase('...')>)`
    .replace(
      /=\s*_resolveComponent\(['"](.+?)['"]\)/g,
      (match, componentName) => {
        const pascalComponentName = toPascalCase(componentName)
        return `= (typeof ${pascalComponentName} === 'undefined' ? _resolveComponent('${componentName}') : ${pascalComponentName});`
      },
    )
}

const sharedCompilerOptions = {
  mode: 'module',
  hoistStatic: true,
  cacheHandlers: true,
  prefixIdentifiers: true,
  inline: true,
} as const

function getTemplateParsedAst(
  vineCompFnCtx: VineCompFnCtx,
  getParsedAst: boolean,
) {
  if (!getParsedAst) {
    return
  }

  return {
    templateParsedAst: parse(vineCompFnCtx.templateSource, {
      parseMode: 'base',
      prefixIdentifiers: true,
      expressionPlugins: ['typescript'],
    }),
  }
}

function compileForSSR(
  vineCompFnCtx: VineCompFnCtx,
  params: Partial<CompilerOptions>,
  getParsedAst: boolean,
) {
  const codegenResult = ssrCompile(
    vineCompFnCtx.templateSource,
    {
      ...sharedCompilerOptions,
      ...params,
    },
  )
  return {
    ...codegenResult,
    ...getTemplateParsedAst(vineCompFnCtx, getParsedAst),
  }
}
function compileForVirtualDOM(
  vineCompFnCtx: VineCompFnCtx,
  params: Partial<CompilerOptions>,
  getParsedAst: boolean,
) {
  const codegenResult = compileVDOM(
    vineCompFnCtx.templateSource,
    {
      ...sharedCompilerOptions,
      ...params,
    },
  )
  return {
    ...codegenResult,
    ...getTemplateParsedAst(vineCompFnCtx, getParsedAst),
  }
}
function compileForVapor(
  vineCompFnCtx: VineCompFnCtx,
  params: Partial<CompilerOptionsVapor>,
  getParsedAst: boolean,
) {
  const codegenResult = compileVapor(
    vineCompFnCtx.templateSource,
    {
      ...sharedCompilerOptions,
      ...params,
    },
  )

  return {
    ...codegenResult,
    ...getTemplateParsedAst(vineCompFnCtx, getParsedAst),
  }
}

export function compileVineTemplate(
  vineCompFnCtx: VineCompFnCtx,
  compilerHooks: VineCompilerHooks,
  params: Partial<CompilerOptions | CompilerOptionsVapor>,
  { ssr, getParsedAst = false }: {
    ssr: boolean
    getParsedAst?: boolean
  },
): (
  (VDOMCodegenResult | VaporCodegenResult)
  & { templateParsedAst?: ReturnType<typeof parse> }
) | null {
  const {
    __enableTransformAssetsURL = true,
    __transformNegativeBool,
    __shouldAddTemplateSuffix,
  } = compilerHooks.getCompilerCtx()
    ?.options
    ?.vueCompilerOptions ?? {}

  try {
    // vue/language-tools / #4583:
    if (
      __shouldAddTemplateSuffix
      && SHOULD_ADD_SUFFIX_REGEXP.test(vineCompFnCtx.templateSource)
    ) {
      vineCompFnCtx.templateSource += '>'
    }

    const nodeTransforms = [
      ...(__enableTransformAssetsURL
        ? [transformAssetUrl]
        : []
      ),
      ...getTransformNegativeBoolPlugin(
        __transformNegativeBool,
      ),
    ]

    if (ssr) {
      return compileForSSR(
        vineCompFnCtx,
        {
          ...params as CompilerOptions,
          nodeTransforms,
        },
        getParsedAst,
      )
    }

    if (vineCompFnCtx.isVapor) {
      return compileForVapor(
        vineCompFnCtx,
        {
          ...params as CompilerOptionsVapor,
          nodeTransforms: [
            // Todo: node transformers implementation needs to be refactored
            // in vapor mode, because the TransformContext is different
          ],
        },
        getParsedAst,
      )
    }

    return compileForVirtualDOM(
      vineCompFnCtx,
      {
        ...params as CompilerOptions,
        nodeTransforms,
      },
      getParsedAst,
    )
  }
  catch {
    return null
  }
}

interface DefaultImportSpecifierMeta { type: 'defaultSpecifier', localName: string }
interface NamespaceImportSpecifierMeta { type: 'namespaceSpecifier', localName: string }
export interface NamedImportSpecifierMeta { type: 'namedSpecifier', specs: Map<string, string> }
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

function isExportRenderFnNode(node: Node, ssr = false): node is ExportNamedDeclaration {
  if (!isExportNamedDeclaration(node)) {
    return false
  }
  return (
    isFunctionDeclaration(node.declaration)
    && node.declaration.id?.name === (ssr ? 'ssrRender' : 'render')
  )
}

function getQuasisNode(
  vineFnCompCtx: VineCompFnCtx,
) {
  return vineFnCompCtx.templateStringNode?.quasi.quasis[0]
}

function computeTemplateErrLocation(
  vineFileCtx: VineFileCtx,
  vineFnCompCtx: VineCompFnCtx,
  errLocation: VueSourceLocation,
) {
  const quasisNode = getQuasisNode(vineFnCompCtx)
  if (!quasisNode) {
    return
  }
  const mapper = lineColumn(
    vineFileCtx.fileMagicCode.original,
    { origin: 1 }, // Babel line/column is 1-based
  )
  const templateStart = quasisNode.start!
  const startOffset = templateStart + errLocation.start.offset
  const endOffset = templateStart + errLocation.end.offset
  const start = mapper.fromIndex(startOffset)
  const end = mapper.fromIndex(endOffset)
  if (!start || !end) {
    return
  }
  const [startColumn, endColumn]
    = (
      start.line === end.line
      && start.col === end.col
    )
      ? [1, Number.POSITIVE_INFINITY]
      : [start.col, end.col]

  const loc: BabelSourceLocation = {
    identifierName: errLocation.source,
    filename: vineFileCtx.fileId,
    start: {
      line: start.line,
      column: startColumn,
      index: startOffset,
    },
    end: {
      line: end.line,
      column: endColumn,
      index: endOffset,
    },
  }
  return loc
}

function setVineTemplateAst(
  vineCompFnCtx: VineCompFnCtx,
  compileResult: ReturnType<typeof compileVineTemplate>,
) {
  const { templateParsedAst } = compileResult!
  let ast = compileResult!.ast

  // Vapor mode's `ast` is `RootIRNode`
  // but we need `RootNode`
  if ('node' in ast) {
    ast = ast.node
  }

  vineCompFnCtx.templateAst = ast
  vineCompFnCtx.templateParsedAst = templateParsedAst

  // Walk the template AST to collect information
  // for component context
  if (!ast) {
    return
  }

  // Collect all `<slot name="...">`
  // for user defined slot names
  walkVueTemplateAst(ast, {
    enter(node) {
      if (node.type !== NodeTypes.ELEMENT) {
        return
      }

      // Collect all template ref literal names
      const maybeRef = node.props.find(
        prop => (
          prop.type === NodeTypes.ATTRIBUTE
          && prop.name === 'ref'
          && prop.value?.type === NodeTypes.TEXT
        ),
      ) as (AttributeNode | undefined)
      if (maybeRef?.value) {
        vineCompFnCtx.templateRefNames.add(maybeRef.value.content)
      }

      if (node.tagType === ElementTypes.COMPONENT) {
        vineCompFnCtx.templateComponentNames.add(node.tag)
      }
      else if (node.tagType === ElementTypes.SLOT) {
        const slotNameAttr = node.props.find(
          prop => (
            prop.type === NodeTypes.ATTRIBUTE
            && prop.name === 'name'
          ),
        ) as (AttributeNode | undefined)
        if (slotNameAttr?.value) {
          vineCompFnCtx.slotsNamesInTemplate.push(slotNameAttr.value.content)
        }
      }
    },
  })
}

export function createSeparatedTemplateComposer(
  compilerHooks: VineCompilerHooks,
  ssr: boolean,
): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineCompFnCtx, string> = new WeakMap()
  const generatedPreambleStmts: WeakMap<VineCompFnCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns: ({
      vineFileCtx,
      vineCompFnCtx,
      mergedImportsMap,
      bindingMetadata,
    }) => {
      let hasTemplateCompileErr = false
      const compileResult = compileVineTemplate(
        vineCompFnCtx,
        compilerHooks,
        {
          scopeId: `data-v-${vineCompFnCtx.scopeId}`,
          inline: false,
          bindingMetadata,
          ...compilerHooks.getCompilerCtx()?.options?.vueCompilerOptions ?? {},
          onError: (e) => {
            hasTemplateCompileErr = true
            compilerHooks.onError(
              vineErr(
                { vineFileCtx, vineCompFnCtx },
                {
                  msg: `[Vine template compile error] ${e.message}`,
                  location: e.loc && computeTemplateErrLocation(vineFileCtx, vineCompFnCtx, e.loc),
                  rawVueTemplateLocation: e.loc,
                },
              ),
            )
          },
          onWarn: (e) => {
            compilerHooks.onWarn(
              vineWarn(
                { vineFileCtx, vineCompFnCtx },
                {
                  msg: `[Vine template compile warning] ${e.message}`,
                  location: e.loc && computeTemplateErrLocation(vineFileCtx, vineCompFnCtx, e.loc),
                  rawVueTemplateLocation: e.loc,
                },
              ),
            )
          },
        },
        {
          ssr,
          // Separate mode needs template's original AST,
          // avoid expressions in template to be compiled as '$setup.foo()'
          getParsedAst: true,
        },
      )
      if (!compileResult) {
        return ''
      }

      // Store the template AST
      setVineTemplateAst(vineCompFnCtx, compileResult)

      if (hasTemplateCompileErr) {
        return ''
      }

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
        else if (isExportRenderFnNode(codeStmt, ssr)) {
          exportRenderFnNode = codeStmt
          continue
        }
        appendToMapArray(
          generatedPreambleStmts,
          vineCompFnCtx,
          code.slice(
            codeStmt.start!,
            codeStmt.end!,
          ),
        )
      }

      if (!exportRenderFnNode) {
        compilerHooks.onError(vineErr({ vineFileCtx, vineCompFnCtx }, {
          msg: '[Vine Error] Cannot find export render function on template composing',
        }))
        return ''
      }
      templateCompileResults.set(
        vineCompFnCtx,
        postProcessForRenderCodegen(
          code.slice(
            exportRenderFnNode.start!,
            exportRenderFnNode.end!,
          ).replace(
            ssr ? 'export function ssrRender' : 'export function render',
            ssr ? 'function __sfc_ssr_render' : 'function __sfc_render',
          ),
        ),
      )

      // For separate mode, the setup function's return expression
      // is combining all the bindings from user imports and all declarations.
      // non-inline mode, or has manual render in normal <script>
      // return bindings from script and script setup
      const allBindings: Record<string, any> = { ...bindingMetadata }
      for (const key in vineFileCtx.userImports) {
        const isType = vineFileCtx.userImports[key].isType
        const isUsedInTemplate = vineFileCtx.userImports[key].isUsedInTemplate?.(vineCompFnCtx)

        if (isUsedInTemplate) {
          if (!isType)
            allBindings[key] = true
        }
        else {
          allBindings[key] = false
        }
      }

      let setupFnReturns = '{ '
      for (const key in allBindings) {
        if (
          allBindings[key] === false
          || (bindingMetadata[key] === VineBindingTypes.PROPS)
        ) {
          // skip unused bindings
        }
        else if (
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
          setupFnReturns += (
            `get ${key}() { return ${key} }, `
            + `set ${key}(${setArg}) { ${key} = ${setArg} }, `
          )
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

export function createInlineTemplateComposer(
  compilerHooks: VineCompilerHooks,
  ssr: boolean,
): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineCompFnCtx, string> = new WeakMap()
  const generatedPreambleStmts: WeakMap<VineCompFnCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns: ({
      vineFileCtx,
      vineCompFnCtx,
      mergedImportsMap,
      bindingMetadata,
    }) => {
      let hasTemplateCompileErr = false
      const compileResult = compileVineTemplate(
        vineCompFnCtx,
        compilerHooks,
        {
          scopeId: `data-v-${vineCompFnCtx.scopeId}`,
          bindingMetadata,
          ...compilerHooks.getCompilerCtx()?.options?.vueCompilerOptions ?? {},
          onError: (e) => {
            if (hasTemplateCompileErr) {
              return
            }
            hasTemplateCompileErr = true
            compilerHooks.onError(
              vineErr(
                { vineFileCtx, vineCompFnCtx },
                {
                  msg: `[Vine template compile error] ${e.message}`,
                  location: e.loc && computeTemplateErrLocation(vineFileCtx, vineCompFnCtx, e.loc),
                  rawVueTemplateLocation: e.loc,
                },
              ),
            )
          },
          onWarn: (e) => {
            compilerHooks.onWarn(
              vineWarn(
                { vineFileCtx, vineCompFnCtx },
                {
                  msg: `[Vine template compile warning] ${e.message}`,
                  location: e.loc && computeTemplateErrLocation(vineFileCtx, vineCompFnCtx, e.loc),
                  rawVueTemplateLocation: e.loc,
                },
              ),
            )
          },
        },
        { ssr },
      )
      if (!compileResult) {
        return ''
      }

      const { preamble, code } = compileResult

      // Store the template AST
      setVineTemplateAst(vineCompFnCtx, compileResult)

      if (hasTemplateCompileErr) {
        return ''
      }

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
        vineCompFnCtx,
        preamble.slice(
          stmt.start!,
          stmt.end!,
        ),
      ))

      // For inline mode, we can directly store the generated code,
      // it's an inline render function
      const finalCode = postProcessForRenderCodegen(code)
      templateCompileResults.set(vineCompFnCtx, finalCode)

      // For inline mode, the setup function's return expression is the render function
      return finalCode
    },
  }
}
