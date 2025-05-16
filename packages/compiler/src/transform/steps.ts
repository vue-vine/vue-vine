import type { BlockStatement, Identifier, Node, VariableDeclaration } from '@babel/types'
import type {
  MergedImportsMap,
  NamedImportSpecifierMeta,
  TemplateCompileComposer,
} from '../template/compose'
import type { VineCompFnCtx, VineCompilerHooks, VineFileCtx } from '../types'
import { isReturnStatement } from '@babel/types'
import { extractIdentifiers, isFunctionType, isInDestructureAssignment, isReferencedIdentifier, isStaticProperty, TS_NODE_TYPES, unwrapTSNode, walkFunctionParams } from '@vue/compiler-dom'
import { walk } from 'estree-walker'
import { fineAllExplicitExports, isCallOf, isStatementContainsVineMacroCall } from '../babel-helpers/ast'
import {
  CREATE_PROPS_REST_PROXY_HELPER,
  CSS_VARS_HELPER,
  DEFINE_COMPONENT_HELPER,
  TO_REFS_HELPER,
  UN_REF_HELPER,
  USE_DEFAULTS_HELPER,
  USE_MODEL_HELPER,
  USE_SLOT_HELPER,
  WITH_ASYNC_CONTEXT_HELPER,
} from '../constants'
import { vineErr } from '../diagnostics'
import { sortStyleImport } from '../style/order'
import { compileCSSVars } from '../style/transform-css-var'
import { filterJoin, showIf } from '../utils'
import { mayContainAwaitExpr, registerImport, wrapWithAsyncContext } from './utils'

const identRE = /^[_$a-z\xA0-\uFFFF][\w$\xA0-\uFFFF]*$/i

export interface TransformContext {
  vineFileCtx: VineFileCtx
  compilerHooks: VineCompilerHooks
  inline: boolean
  ssr: boolean
  mergedImportsMap: MergedImportsMap
  templateComposer: TemplateCompileComposer
}
export interface SingleFnCompTransformCtx {
  vineCompFnCtx: VineCompFnCtx
  hasAwait: boolean
  vueImportsSpecs: Map<string, string>
  vineCompFnBody: BlockStatement
  vineCompFnStart: number
  vineCompFnEnd: number
  firstStmt: Node
  lastStmt: Node

  isNeedUseDefaults: boolean
  // Flag that is used for noticing prepend `useDefaults` helper function.
  isPrependedUseDefaults: boolean
}

export function createVueImportsSpecs(
  transformCtx: TransformContext,
  vineCompFnCtx: VineCompFnCtx,
) {
  const { inline, mergedImportsMap } = transformCtx

  // Add `defineComponent` helper function import specifier
  let vueImportsMeta = mergedImportsMap.get('vue')
  if (!vueImportsMeta) {
    vueImportsMeta = {
      type: 'namedSpecifier',
      specs: new Map(),
    } as NamedImportSpecifierMeta
    mergedImportsMap.set('vue', vueImportsMeta)
  }
  const vueImportsSpecs = (vueImportsMeta as NamedImportSpecifierMeta).specs
  if (!vueImportsSpecs.has(DEFINE_COMPONENT_HELPER)) {
    vueImportsSpecs.set(DEFINE_COMPONENT_HELPER, `_${DEFINE_COMPONENT_HELPER}`)
  }
  // add useCssVars
  if (!vueImportsSpecs.has(CSS_VARS_HELPER) && vineCompFnCtx.cssBindings) {
    vueImportsSpecs.set(CSS_VARS_HELPER, `_${CSS_VARS_HELPER}`)
    if (inline) {
      vueImportsSpecs.set(UN_REF_HELPER, `_${UN_REF_HELPER}`)
    }
  }
  // add useSlots
  if (Object.entries(vineCompFnCtx.slots).length > 0) {
    vueImportsSpecs.set(USE_SLOT_HELPER, `_${USE_SLOT_HELPER}`)
  }

  return vueImportsSpecs
}

export function generateAsyncContext(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vueImportsSpecs, vineCompFnBody, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Handle component's setup logic from function body
  for (const vineFnBodyStmt of vineCompFnBody.body) {
    const mayContain = mayContainAwaitExpr(vineFnBodyStmt)
    if (!mayContain || !mayContain.awaitExpr) {
      continue
    }

    // has await expression in function body root level statements,
    // we need to add 'withAsyncContext' helper, imported from 'vue'
    vueImportsSpecs.set(WITH_ASYNC_CONTEXT_HELPER, `_${WITH_ASYNC_CONTEXT_HELPER}`)

    const { awaitExpr, isNeedResult } = mayContain
    fnTransformCtx.hasAwait = true
    ms.update(
      awaitExpr.start!,
      awaitExpr.end!,
      wrapWithAsyncContext(
        isNeedResult,
        ms.original.slice(
          awaitExpr.argument.start!,
          awaitExpr.argument.end!,
        ),
      ),
    )
  }

  // Insert variables that required by async context generated code
  if (fnTransformCtx.hasAwait) {
    ms.prependLeft(
      firstStmt.start!,
      'let __temp, __restore;\n',
    )
  }
}

export function onlyRemainFunctionBody(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const ms = transformCtx.vineFileCtx.fileMagicCode
  const {
    vineCompFnStart,
    vineCompFnEnd,
    firstStmt,
    lastStmt,
  } = fnTransformCtx

  // Replace the original function delcaration start to its body's first statement's start,
  // and the last statement's end to the function declaration end.
  // Wrap all body statements into a `setup(...) { ... }`
  ms.remove(vineCompFnStart, firstStmt.start!)
  ms.remove(lastStmt.end!, vineCompFnEnd)
}

export function removeStatementsContainsMacro(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnBody } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Remove all statements that contain macro calls
  vineCompFnBody.body.forEach((stmt) => {
    if (
      isStatementContainsVineMacroCall(stmt)
      || isReturnStatement(stmt)
    ) {
      ms.remove(stmt.start!, stmt.end!)
    }
  })
}

export function buildSetupFormalParams(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt, lastStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Build formal parameters of `setup` function
  const setupCtxDestructFormalParams: {
    field: string
    alias?: string
  }[] = []
  if (vineCompFnCtx.emits.length > 0) {
    setupCtxDestructFormalParams.push({
      field: 'emit',
      alias: '__emit',
    })
    ms.prependLeft(
      firstStmt.start!,
      `const ${vineCompFnCtx.emitsAlias} = __emit;\n`,
    )
  }

  // Always add `expose` to the setup context destructuring
  setupCtxDestructFormalParams.push({
    field: 'expose',
    alias: '__expose',
  })

  const setupFormalParams = `__props${
    setupCtxDestructFormalParams.length > 0
      ? `, { ${
        setupCtxDestructFormalParams.map(
          ({ field, alias }) => `${field}${showIf(Boolean(alias), `: ${alias}`)}`,
        ).join(', ')
      } }`
      : ' /* No setup ctx destructuring */'
  }`

  ms.prependLeft(firstStmt.start!, `${vineCompFnCtx.isAsync ? 'async ' : ''}setup(${setupFormalParams}) {\n`)
  ms.appendRight(lastStmt.end!, '\n}')
}

export function generateVineSlots(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Code generation for vineSlots
  if (Object.entries(vineCompFnCtx.slots).length > 0) {
    ms.prependLeft(
      firstStmt.start!,
      `const ${vineCompFnCtx.slotsAlias} = _${USE_SLOT_HELPER}();\n`,
    )
  }
}

export function generateVineModel(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { mergedImportsMap } = transformCtx
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Code generation for vineModel
  if (Object.entries(vineCompFnCtx.vineModels).length > 0) {
    registerImport(
      mergedImportsMap,
      'vue',
      USE_MODEL_HELPER,
      `_${USE_MODEL_HELPER}`,
    )

    let modelCodeGen: string[] = []

    for (const [modelName, modelDef] of Object.entries(vineCompFnCtx.vineModels)) {
      const { varName } = modelDef
      modelCodeGen.push(
        `const ${varName} = _${USE_MODEL_HELPER}(__props, '${modelName}')`,
      )
    }

    const modelCodeGenStr = `\n${modelCodeGen.join('\n')}\n`

    ms.prependLeft(
      firstStmt.start!,
      modelCodeGenStr,
    )
  }
}

export function generateUseCssVars(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { inline } = transformCtx
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Insert `useCssVars` helper function call
  if (
    Array.from(
      Object.entries(vineCompFnCtx.cssBindings),
    ).length > 0
  ) {
    ms.prependLeft(
      firstStmt.start!,
      `\n${compileCSSVars(vineCompFnCtx, inline)}\n`,
    )
  }
}

export function generateVinePropToRefs(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const { mergedImportsMap } = transformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // If there's any prop that is from macro define,
  // we need to import `toRefs`
  if (
    Object
      .values(vineCompFnCtx.props)
      .some(meta => Boolean(meta.isFromMacroDefine))
  ) {
    registerImport(
      mergedImportsMap,
      'vue',
      TO_REFS_HELPER,
      `_${TO_REFS_HELPER}`,
    )
    const propsFromMacro = Object.entries(vineCompFnCtx.props)
      .filter(([_, meta]) => Boolean(meta.isFromMacroDefine))
      .map(([propName, _]) => propName)
    ms.prependLeft(
      firstStmt.start!,
      `const { ${propsFromMacro.join(', ')} } = _toRefs(${vineCompFnCtx.propsAlias});\n`,
    )
  }
}

export function generateVineExpose(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt, lastStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // vineExpose
  if (vineCompFnCtx.expose) {
    const { paramObj } = vineCompFnCtx.expose
    ms.appendRight(
      lastStmt.end!,
      `\n__expose(${
        ms.original.slice(
          paramObj.start!,
          paramObj.end!,
        )
      });\n`,
    )
  }
  else {
    ms.prependLeft(
      firstStmt.start!,
      '\n__expose();\n',
    )
  }
}

export function generateSetupReturns(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineFileCtx, templateComposer, mergedImportsMap } = transformCtx
  const { vineCompFnCtx, lastStmt } = fnTransformCtx
  const { compileSetupFnReturns } = templateComposer
  const ms = transformCtx.vineFileCtx.fileMagicCode

  const setupFnReturns = compileSetupFnReturns({
    vineFileCtx,
    vineCompFnCtx,
    templateSource: vineCompFnCtx.templateSource,
    mergedImportsMap,
    bindingMetadata: vineCompFnCtx.bindings,
  })

  // Insert setup function's return statement
  ms.appendRight(lastStmt.end!, `\nreturn ${setupFnReturns};`)
}

export function generatePropsDestructure(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  // Replace references to destructured prop identifiers
  // with access expressions like `x` to `props.x`~

  const { vineFileCtx, compilerHooks, mergedImportsMap } = transformCtx
  const { vineCompFnCtx, vineCompFnBody } = fnTransformCtx

  if (Object.keys(vineCompFnCtx.propsDestructuredNames).length > 0) {
    // Add `const { ...< destructured names >... } = propsAlias` to the top of the function
    const destructuredNames = Object.entries(vineCompFnCtx.propsDestructuredNames)
      .reduce((acc, [name, data]) => {
        if (data.isRest) {
          acc.push(`...${name}`)
        }
        else if (data.alias) {
          acc.push(`'${name}': ${data.alias}`)
        }
        else {
          acc.push(name)
        }
        return acc
      }, [] as string[])

    vineFileCtx.fileMagicCode.prependLeft(
      vineCompFnBody.body[0].start!,
      `const { ${destructuredNames.join(', ')} } = _${TO_REFS_HELPER}(${vineCompFnCtx.propsAlias});\n`,
    )
    // Add `toRefs` import specifier
    registerImport(mergedImportsMap, 'vue', TO_REFS_HELPER, `_${TO_REFS_HELPER}`)
  }

  type Scope = Record<string, boolean>
  const rootScope: Scope = Object.create(null)
  const scopeStack: Scope[] = [rootScope]
  const excludedIds = new WeakSet<Identifier>()
  const parentStack: Node[] = []
  const propsLocalToPublicMap: Record<string, string> = Object.create(null)
  let currentScope = rootScope

  for (const [destructName, destructMeta] of Object.entries(vineCompFnCtx.propsDestructuredNames)) {
    const local = destructMeta.alias ?? destructName
    rootScope[local] = true
    propsLocalToPublicMap[local] = destructName
  }

  function pushScope() {
    currentScope = Object.create(currentScope)
    scopeStack.push(currentScope)
  }
  function popScope() {
    scopeStack.pop()
    currentScope = scopeStack[scopeStack.length - 1]
  }
  function registerLocalBinding(id: Identifier) {
    excludedIds.add(id)
    if (currentScope) {
      currentScope[id.name] = false
    }
  }
  function walkScope(node: BlockStatement, isRoot = false) {
    for (const stmt of node.body) {
      if (stmt.type === 'VariableDeclaration') {
        walkVariableDeclaration(stmt, isRoot)
      }
      else if (
        stmt.type === 'FunctionDeclaration'
        || stmt.type === 'ClassDeclaration'
      ) {
        if (stmt.declare || !stmt.id)
          continue
        registerLocalBinding(stmt.id)
      }
      else if (
        (stmt.type === 'ForOfStatement' || stmt.type === 'ForInStatement')
        && stmt.left.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.left)
      }
      else if (
        stmt.type === 'ExportNamedDeclaration'
        && stmt.declaration
        && stmt.declaration.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.declaration, isRoot)
      }
      else if (
        stmt.type === 'LabeledStatement'
        && stmt.body.type === 'VariableDeclaration'
      ) {
        walkVariableDeclaration(stmt.body, isRoot)
      }
    }
  }
  function walkVariableDeclaration(stmt: VariableDeclaration, isRoot = false) {
    if (stmt.declare) {
      return
    }
    for (const decl of stmt.declarations) {
      const isDefineProps
        = isRoot && decl.init && isCallOf(unwrapTSNode(decl.init), 'defineProps')
      for (const id of extractIdentifiers(decl.id)) {
        if (isDefineProps) {
          // for defineProps destructure, only exclude them since they
          // are already passed in as knownProps
          excludedIds.add(id)
        }
        else {
          registerLocalBinding(id)
        }
      }
    }
  }
  function checkUsage(node: Node, method: string, alias = method) {
    if (isCallOf(node, alias)) {
      const arg = unwrapTSNode(node.arguments[0])
      if (arg.type === 'Identifier' && currentScope[arg.name]) {
        compilerHooks.onError(
          vineErr(
            { vineFileCtx, vineCompFnCtx },
            {
              msg: `"${arg.name}" is a destructured prop and should not be passed directly to ${method}(). `
                + `Pass a getter () => ${arg.name} instead.`,
              location: arg.loc,
            },
          ),
        )
      }
    }
  }
  function genPropsAccessExp(name: string, propsAlias: string): string {
    return identRE.test(name)
      ? `${propsAlias}.${name}`
      : `${propsAlias}[${JSON.stringify(name)}]`
  }
  function rewriteId(id: Identifier, parent: Node, parentStack: Node[]) {
    if (
      (parent.type === 'AssignmentExpression' && id === parent.left)
      || parent.type === 'UpdateExpression'
    ) {
      compilerHooks.onError(
        vineErr(
          { vineFileCtx, vineCompFnCtx },
          {
            msg: `Cannot assign to destructured props as they are readonly.`,
            location: id.loc,
          },
        ),
      )
    }

    const publicName = propsLocalToPublicMap[id.name]
    // If the current identifier is a rest prop, do not rewrite it.
    if (vineCompFnCtx.propsDestructuredNames[publicName]?.isRest) {
      return
    }

    if (isStaticProperty(parent) && parent.shorthand) {
      // let binding used in a property shorthand
      // skip for destructure patterns
      if (
        !(parent as any).inPattern
        || isInDestructureAssignment(parent, parentStack)
      ) {
        // const x = { prop } -> const x = { prop: propsAlias.prop }
        vineFileCtx.fileMagicCode.appendLeft(
          id.end!,
          `: ${genPropsAccessExp(publicName, vineCompFnCtx.propsAlias)}`,
        )
      }
    }
    else {
      // x --> propsAlias.x
      vineFileCtx.fileMagicCode.overwrite(
        id.start!,
        id.end!,
        genPropsAccessExp(publicName, vineCompFnCtx.propsAlias),
      )
    }
  }

  walkScope(vineCompFnBody)

  walk(vineCompFnBody, {
    enter(node: Node, parent: Node | null) {
      parent && parentStack.push(parent)

      // skip type nodes
      if (
        parent
        && parent.type.startsWith('TS')
        && !TS_NODE_TYPES.includes(parent.type)
      ) {
        return this.skip()
      }

      checkUsage(node, 'watch', vineFileCtx.vueImportAliases.watch)
      checkUsage(node, 'toRef', vineFileCtx.vueImportAliases.toRef)

      // function scopes
      if (isFunctionType(node)) {
        pushScope()
        walkFunctionParams(node, registerLocalBinding)
        if (node.body.type === 'BlockStatement') {
          walkScope(node.body)
        }
        return
      }

      // catch param
      if (node.type === 'CatchClause') {
        pushScope()
        if (node.param && node.param.type === 'Identifier') {
          registerLocalBinding(node.param)
        }
        walkScope(node.body)
        return
      }

      // non-function block scopes
      if (node.type === 'BlockStatement' && parent && !isFunctionType(parent)) {
        pushScope()
        walkScope(node)
        return
      }

      if (node.type === 'Identifier') {
        if (
          isReferencedIdentifier(node, parent!, parentStack)
          && !excludedIds.has(node)
        ) {
          if (currentScope[node.name]) {
            rewriteId(node, parent!, parentStack)
          }
        }
      }
    },
    leave(node: Node, parent: Node | null) {
      parent && parentStack.pop()
      if (
        (node.type === 'BlockStatement' && parent && !isFunctionType(parent))
        || isFunctionType(node)
      ) {
        popScope()
      }
    },
  })
}

export function generatePropsRestProxy(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt, vueImportsSpecs } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // add createPropsRestProxy
  const propsRestEntry = Object.entries(vineCompFnCtx.propsDestructuredNames).find(([_, propMeta]) => propMeta.isRest)
  if (propsRestEntry) {
    vueImportsSpecs.set(CREATE_PROPS_REST_PROXY_HELPER, `_${CREATE_PROPS_REST_PROXY_HELPER}`)
  }

  if (propsRestEntry) {
    const [propName, _] = propsRestEntry
    ms.prependLeft(
      firstStmt.start!,
      `const ${propName} = _${CREATE_PROPS_REST_PROXY_HELPER}(__props, [${
        Object.entries(vineCompFnCtx.propsDestructuredNames)
          .filter(([_, propMeta]) => !propMeta.isRest)
          .map(([propName, _]) => `'${propName}'`)
          .join(', ')
      }]);\n`,
    )
  }
}

export function generatePropsDeclaration(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { mergedImportsMap } = transformCtx
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Insert `useDefaults` helper function import specifier.
  // And prepend `const propsAlias = useDefaults(...)` before the first statement.
  let propsDeclarationStmt = `const ${vineCompFnCtx.propsAlias} = __props;\n`
  if (
    fnTransformCtx.isNeedUseDefaults
    && !fnTransformCtx.isPrependedUseDefaults
  ) {
    fnTransformCtx.isPrependedUseDefaults = true
    registerImport(
      mergedImportsMap,
      'vue-vine',
      USE_DEFAULTS_HELPER,
      `_${USE_DEFAULTS_HELPER}`,
    )
    propsDeclarationStmt = `const ${vineCompFnCtx.propsAlias} = _${USE_DEFAULTS_HELPER}(__props, {\n${
      Object.entries(vineCompFnCtx.props)
        .filter(([_, propMeta]) => Boolean(propMeta.default))
        .map(([propName, propMeta]) => `  ${propName}: () => (${
          ms.original.slice(
            propMeta.default!.start!,
            propMeta.default!.end!,
          )
        })`)
        .join(',\n')
    }\n})\n`
  }
  ms.prependLeft(
    firstStmt.start!,
    propsDeclarationStmt,
  )
}

export function generateVineFactory(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const {
    inline,
    ssr,
    vineFileCtx,
    compilerHooks,
    templateComposer: {
      generatedPreambleStmts,
      templateCompileResults,
    },
  } = transformCtx
  const { vineCompFnCtx, firstStmt, lastStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode
  const isDev = compilerHooks.getCompilerCtx().options.envMode !== 'production'

  // Get all explicit declared export in exportNamedDeclarations
  const explicitExports = fineAllExplicitExports(vineFileCtx.exportNamedDeclarations)

  // Defaultly set `export` for all component functions
  // because it's required by HMR context.
  ms.prependLeft(firstStmt.start!, `${
    explicitExports.includes(vineCompFnCtx.fnName)
      ? ''
      : 'export'
  } const ${
    vineCompFnCtx.fnName
  } = (() => {\n${
    // Prepend all generated preamble statements
    generatedPreambleStmts
      .get(vineCompFnCtx)
      ?.join('\n') ?? ''
  }\n`)

  ms.appendRight(lastStmt.end!, `\n${
    inline
      ? ''
      // Not-inline mode, we need manually add the
      // render function to the component object.
      : `${
        templateCompileResults.get(vineCompFnCtx) ?? ''
      }\n__vine.${ssr ? 'ssrRender' : 'render'} = ${ssr ? '__sfc_ssr_render' : '__sfc_render'}`
  }\n`)

  if (vineFileCtx.styleDefine[vineCompFnCtx.scopeId]) {
    ms.appendRight(lastStmt.end!, `__vine.__scopeId = 'data-v-${vineCompFnCtx.scopeId}';\n`)
  }

  if (isDev) {
    ms.appendRight(lastStmt.end!, `__vine.__hmrId = '${vineCompFnCtx.scopeId}';\n`)
  }

  // handle Web Component styles
  if (vineCompFnCtx.isCustomElement) {
    ms.appendRight(lastStmt.end!, `__vine.styles = [__${vineCompFnCtx.fnName.toLowerCase()}_styles];\n`)
  }

  ms.appendRight(lastStmt.end!, `\nreturn __vine\n})();`)

  // Record component function to HMR
  if (isDev) {
    ms.appendRight(
      ms.length(),
      `\n\ntypeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(${vineCompFnCtx.fnName}.__hmrId, ${vineCompFnCtx.fnName});\n`,
    )
  }

  if (vineCompFnCtx.isExportDefault) {
    ms.appendRight(
      ms.length(),
      `\n\nexport default ${vineCompFnCtx.fnName};\n\n`,
    )
  }
}

export function generateDefineComponentWrapper(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { firstStmt, lastStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  ms.prependLeft(firstStmt.start!, `const __vine = _defineComponent({\n`)
  ms.appendRight(lastStmt.end!, '\n})')
}

export function generateBasicComponentOptions(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  const basicOptionsFields = `${vineCompFnCtx.options
    ? `...${ms.original.slice(
      vineCompFnCtx.options.start!,
      vineCompFnCtx.options.end!,
    )},`
    : `name: '${vineCompFnCtx.fnName}',`
  }\n`

  ms.prependLeft(firstStmt.start!, basicOptionsFields)
}

export function generatePropsOptions(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineFileCtx } = transformCtx
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  const segementsFromProps = Object.entries(vineCompFnCtx.props).map(([propName, propMeta]) => {
    const metaFields = []
    if (propMeta.isRequired) {
      metaFields.push('required: true')
    }
    if (propMeta.isBool) {
      metaFields.push('type: Boolean')
    }
    if (propMeta.validator) {
      metaFields.push(`validator: ${
        vineFileCtx.originCode.slice(
          propMeta.validator.start!,
          propMeta.validator.end!,
        )
      }`)
    }
    return `${
      propMeta.nameNeedQuoted
        ? `'${propName}'`
        : propName
    }: { ${
      showIf(
        metaFields.filter(Boolean).length > 0,
        filterJoin(metaFields, ', '),
        '/* Simple prop */',
      )
    } },`
  })

  const segmentsFromVineModel = Object
    .entries(vineCompFnCtx.vineModels)
    .reduce<string[]>((segments, [modelName, modelDef]) => {
      const { modelModifiersName, modelOptions } = modelDef
      segments.push(
        `${modelName}: ${
          modelOptions
            ? vineFileCtx.originCode.slice(
                modelOptions.start!,
                modelOptions.end!,
              )
            : '{}'
        },`,
      )
      segments.push(
        `${modelModifiersName}: {},`,
      )

      return segments
    }, [])

  const propsOptions = [
    ...segementsFromProps,
    ...segmentsFromVineModel,
  ]

  const propsOptionsFields = `${propsOptions.length > 0
    ? `props: {\n${
      propsOptions.join('\n')
    }\n},`
    : '/* No props */'
  }\n`

  ms.prependLeft(firstStmt.start!, propsOptionsFields)
}

export function generateEmitsOptions(
  transformCtx: TransformContext,
  fnTransformCtx: SingleFnCompTransformCtx,
) {
  const { vineCompFnCtx, firstStmt } = fnTransformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  const emitsKeys = [
    ...vineCompFnCtx.emits.map(emit => `'${emit}'`),
    ...Object.keys(vineCompFnCtx.vineModels).map(modelName => `'update:${modelName}'`),
  ]

  const emitsOptionsFields = `${emitsKeys.length > 0
    ? `emits: [${
      emitsKeys.join(', ')
    }],`
    : '/* No emits */'
  }\n`

  ms.prependLeft(firstStmt.start!, emitsOptionsFields)
}

export function generateStyleImports(
  transformCtx: TransformContext,
) {
  const { vineFileCtx } = transformCtx
  // Traverse file context's `styleDefine`, and generate import statements.
  // Ordered by their import releationship.
  const styleImportStmts = sortStyleImport(vineFileCtx)
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Prepend all style import statements
  ms.prepend(`\n${styleImportStmts.join('\n')}\n`)
}

export function generateAllImports(
  transformCtx: TransformContext,
) {
  const { mergedImportsMap } = transformCtx
  const ms = transformCtx.vineFileCtx.fileMagicCode

  // Prepend all imports
  for (const [importSource, importMeta] of mergedImportsMap) {
    if (importMeta.type === 'namedSpecifier') {
      const { specs } = importMeta
      const specifiers = [...specs.entries()]
      const importStmt = `import { ${
        specifiers.map(
          ([specifier, alias]) => `${specifier}${showIf(Boolean(alias), ` as ${alias}`)}`,
        ).join(', ')
      } } from '${importSource}';\n`
      ms.prepend(importStmt)
    }
    else if (importMeta.type === 'defaultSpecifier') {
      const importStmt = `import ${importMeta.localName} from '${importSource}';\n`
      ms.prepend(importStmt)
    }
    else if (importMeta.type === 'namespaceSpecifier') {
      const importStmt = `import * as ${importMeta.localName} from '${importSource}';\n`
      ms.prepend(importStmt)
    }
  }
}
