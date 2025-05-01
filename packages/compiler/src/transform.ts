import type { AwaitExpression, BlockStatement, Identifier, Node, VariableDeclaration } from '@babel/types'
import type { MergedImportsMap, NamedImportSpecifierMeta } from './template/compose'
import type { VineCompFnCtx, VineCompilerHooks, VineFileCtx } from './types'
import {
  isAwaitExpression,
  isBlockStatement,
  isExpressionStatement,
  isReturnStatement,
  isVariableDeclaration,
  traverse,
} from '@babel/types'
import { extractIdentifiers, isFunctionType, isInDestructureAssignment, isReferencedIdentifier, isStaticProperty, TS_NODE_TYPES, unwrapTSNode, walkFunctionParams } from '@vue/compiler-dom'
import { walk } from 'estree-walker'
import { fineAllExplicitExports, isCallOf, isStatementContainsVineMacroCall } from './babel-helpers/ast'
import {
  CREATE_PROPS_REST_PROXY_HELPER,
  CSS_VARS_HELPER,
  DEFINE_COMPONENT_HELPER,
  EXPECTED_ERROR,
  TO_REFS_HELPER,
  UN_REF_HELPER,
  USE_DEFAULTS_HELPER,
  USE_MODEL_HELPER,
  USE_SLOT_HELPER,
  WITH_ASYNC_CONTEXT_HELPER,
} from './constants'
import { vineErr } from './diagnostics'
import { sortStyleImport } from './style/order'
import { compileCSSVars } from './style/transform-css-var'
import { createInlineTemplateComposer, createSeparatedTemplateComposer } from './template/compose'
import { filterJoin, showIf } from './utils'

const identRE = /^[_$a-z\xA0-\uFFFF][\w$\xA0-\uFFFF]*$/i

function wrapWithAsyncContext(
  isNeedResult: boolean,
  exprSourceCode: string,
) {
  return isNeedResult
    ? `(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    __temp = await __temp,
    __restore(),
    __temp
    )`
    : `;(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    await __temp,
    __restore()
  );`
}

function mayContainAwaitExpr(vineFnBodyStmt: Node) {
  let awaitExpr: AwaitExpression | undefined
  const isExprStmt = isExpressionStatement(vineFnBodyStmt)
  const isVarDeclStmt = isVariableDeclaration(vineFnBodyStmt)

  if (!(
    isVarDeclStmt
    || isExprStmt
  )) {
    return null
  }

  const isNeedResult = (
    isVarDeclStmt
    || vineFnBodyStmt.expression.type === 'AssignmentExpression'
  )

  try {
    traverse(vineFnBodyStmt, (descendant) => {
      if (isBlockStatement(descendant)) {
        throw new Error(EXPECTED_ERROR)
      }
      else if (isAwaitExpression(descendant)) {
        awaitExpr = descendant
        throw new Error(EXPECTED_ERROR)
      }
    })
  }
  catch (error: any) {
    if (error.message === EXPECTED_ERROR) {
      return {
        isNeedResult,
        awaitExpr,
      }
    }
    throw error
  }

  return null
}

function registerImport(
  mergedImportsMap: MergedImportsMap,
  importSource: string,
  specifier: string,
  alias: string,
) {
  const vueVineImports = mergedImportsMap.get(importSource)
  if (!vueVineImports) {
    mergedImportsMap.set(importSource, {
      type: 'namedSpecifier',
      specs: new Map([[specifier, alias]]),
    })
  }
  else {
    const vueImportsSpecs = (vueVineImports as NamedImportSpecifierMeta).specs
    vueImportsSpecs.set(specifier, alias)
  }
}

function setupCodeGenerationForVineModel(
  vineFnCompCtx: VineCompFnCtx,
): string {
  let modelCodeGen: string[] = []

  for (const [modelName, modelDef] of Object.entries(vineFnCompCtx.vineModels)) {
    const { varName } = modelDef
    modelCodeGen.push(
      `const ${varName} = _${USE_MODEL_HELPER}(__props, '${modelName}')`,
    )
  }

  return `\n${modelCodeGen.join('\n')}\n`
}

function propsOptionsCodeGeneration(
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
) {
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

  return [
    ...segementsFromProps,
    ...segmentsFromVineModel,
  ]
}

function rewriteDestructuredPropAccess(
  compilerHooks: VineCompilerHooks,
  vineFileCtx: VineFileCtx,
  vineCompFnCtx: VineCompFnCtx,
  vineCompFnBody: BlockStatement,
) {
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
          `: ${genPropsAccessExp(propsLocalToPublicMap[id.name], vineCompFnCtx.propsAlias)}`,
        )
      }
    }
    else {
      // x --> propsAlias.x
      vineFileCtx.fileMagicCode.overwrite(
        id.start!,
        id.end!,
        genPropsAccessExp(propsLocalToPublicMap[id.name], vineCompFnCtx.propsAlias),
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

/**
 * Processing `.vine.ts` file transforming.
 *
 * Since we need to support sourcemap, we can't replace or cut-out too much code.
 * The process can be summarized in these steps:
 *
 * 1. Merge all imports, including user imports and other required imports by generated code.
 *    We need to remove all imports from the original code, one by one, and then prepend the
 *    merged imports to the code, based on our analysis result.
 *
 * 2. - Transform every Vine component function to be an IIFE.
 *      it's for creating a independent scope, so we can put those statements can be hosted.
 */
export function transformFile(
  vineFileCtx: VineFileCtx,
  compilerHooks: VineCompilerHooks,
  inline = true,
  ssr = false,
): void {
  const isDev = compilerHooks.getCompilerCtx().options.envMode !== 'production'
  const ms = vineFileCtx.fileMagicCode

  // Traverse file context's `styleDefine`, and generate import statements.
  // Ordered by their import releationship.
  const styleImportStmts = sortStyleImport(vineFileCtx)
  const mergedImportsMap: MergedImportsMap = new Map()

  // Get all explicit declared export in exportNamedDeclarations
  const explicitExports = fineAllExplicitExports(vineFileCtx.exportNamedDeclarations)

  // Flag that is used for noticing prepend `useDefaults` helper function.
  let isPrependedUseDefaults = false

  const {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns,
  } = inline // Get template composer based on inline option
    ? createInlineTemplateComposer(compilerHooks, ssr)
    : createSeparatedTemplateComposer(compilerHooks, ssr)

  // Traverse all component functions and transform them into IIFE
  for (const vineCompFnCtx of vineFileCtx.vineCompFns) {
    const setupFnReturns = compileSetupFnReturns({
      vineFileCtx,
      vineCompFnCtx,
      templateSource: vineCompFnCtx.templateSource,
      mergedImportsMap,
      bindingMetadata: vineCompFnCtx.bindings,
    })
    const isNeedUseDefaults = Object
      .values(vineCompFnCtx.props)
      .some(meta => Boolean(meta.default))

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
    // add createPropsRestProxy
    const isNeedCreatePropsRestProxy = Object.values(vineCompFnCtx.propsDestructuredNames).some(prop => prop.isRest)
    if (isNeedCreatePropsRestProxy) {
      vueImportsSpecs.set(CREATE_PROPS_REST_PROXY_HELPER, `_${CREATE_PROPS_REST_PROXY_HELPER}`)
    }

    const vineCompFnStart = vineCompFnCtx.fnDeclNode.start!
    const vineCompFnEnd = vineCompFnCtx.fnDeclNode.end!
    const vineCompFnBody = vineCompFnCtx.fnItselfNode?.body

    if (!isBlockStatement(vineCompFnBody)) {
      return
    }

    let hasAwait = false

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
      hasAwait = true
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

    const firstStmt = vineCompFnBody.body[0]
    const lastStmt = vineCompFnBody.body[vineCompFnBody.body.length - 1]

    // Replace the original function delcaration start to its body's first statement's start,
    // and the last statement's end to the function declaration end.
    // Wrap all body statements into a `setup(...) { ... }`
    ms.remove(vineCompFnStart, firstStmt.start!)
    ms.remove(lastStmt.end!, vineCompFnEnd)

    // Remove all statements that contain macro calls
    vineCompFnBody.body.forEach((stmt) => {
      if (
        isStatementContainsVineMacroCall(stmt)
        || isReturnStatement(stmt)
      ) {
        ms.remove(stmt.start!, stmt.end!)
      }
    })

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

    let setupFormalParams = `__props${
      setupCtxDestructFormalParams.length > 0
        ? `, { ${
          setupCtxDestructFormalParams.map(
            ({ field, alias }) => `${field}${showIf(Boolean(alias), `: ${alias}`)}`,
          ).join(', ')
        } }`
        : ' /* No setup ctx destructuring */'
    }`

    // Code generation for vineSlots
    if (Object.entries(vineCompFnCtx.slots).length > 0) {
      ms.prependLeft(
        firstStmt.start!,
        `const ${vineCompFnCtx.slotsAlias} = _${USE_SLOT_HELPER}();\n`,
      )
    }

    // Code generation for vineModel
    if (Object.entries(vineCompFnCtx.vineModels).length > 0) {
      registerImport(
        mergedImportsMap,
        'vue',
        USE_MODEL_HELPER,
        `_${USE_MODEL_HELPER}`,
      )
      ms.prependLeft(
        firstStmt.start!,
        setupCodeGenerationForVineModel(vineCompFnCtx),
      )
    }

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

    // Replace references to destructured prop identifiers
    // with access expressions like `x` to `props.x`
    rewriteDestructuredPropAccess(
      compilerHooks,
      vineFileCtx,
      vineCompFnCtx,
      vineCompFnBody,
    )
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

    if (isNeedCreatePropsRestProxy) {
      ms.prependLeft(
        firstStmt.start!,
        `const __propsRestProxy = _${CREATE_PROPS_REST_PROXY_HELPER}(__props, [${
          Object.entries(vineCompFnCtx.propsDestructuredNames)
            .filter(([_, propMeta]) => !propMeta.isRest)
            .map(([propName, _]) => `'${propName}'`)
            .join(', ')
        }]);\n`,
      )
    }

    // Insert `useDefaults` helper function import specifier.
    // And prepend `const propsAlias = useDefaults(...)` before the first statement.
    let propsDeclarationStmt = `const ${vineCompFnCtx.propsAlias} = __props;\n`
    if (
      isNeedUseDefaults
      && !isPrependedUseDefaults
    ) {
      isPrependedUseDefaults = true
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

    // Insert variables that required by async context generated code
    if (hasAwait) {
      ms.prependLeft(
        firstStmt.start!,
        'let __temp, __restore;\n',
      )
    }

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

    // Insert setup function's return statement
    ms.appendRight(lastStmt.end!, `\nreturn ${setupFnReturns};`)

    ms.prependLeft(firstStmt.start!, `${vineCompFnCtx.isAsync ? 'async ' : ''}setup(${setupFormalParams}) {\n`)
    ms.appendRight(lastStmt.end!, '\n}')

    const emitsKeys = [
      ...vineCompFnCtx.emits.map(emit => `'${emit}'`),
      ...Object.keys(vineCompFnCtx.vineModels).map(modelName => `'update:${modelName}'`),
    ]
    const propsOptionFields = propsOptionsCodeGeneration(
      vineFileCtx,
      vineCompFnCtx,
    )

    ms.prependLeft(firstStmt.start!, `const __vine = _defineComponent({\n${
      // Some basic component options
      vineCompFnCtx.options
        ? `...${ms.original.slice(
          vineCompFnCtx.options.start!,
          vineCompFnCtx.options.end!,
        )},`
        : `name: '${vineCompFnCtx.fnName}',`
    }\n${
      propsOptionFields.length > 0
        ? `props: {\n${
          propsOptionsCodeGeneration(
            vineFileCtx,
            vineCompFnCtx,
          ).join('\n')
        }\n},`
        : '/* No props */'
    }\n${
      emitsKeys.length > 0
        ? `emits: [${
          emitsKeys.join(', ')
        }],`
        : '/* No emits */'
    }\n`)
    ms.appendRight(lastStmt.end!, '\n})')

    // Defaultly set `export` for all component functions
    // because it's required by HMR context.
    ms.prependLeft(firstStmt.start!, `\n${
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
    }\n${
      showIf(
        Boolean(vineFileCtx.styleDefine[vineCompFnCtx.scopeId]),
        `__vine.__scopeId = 'data-v-${vineCompFnCtx.scopeId}';`,
      )}\n${
      isDev ? `__vine.__hmrId = '${vineCompFnCtx.scopeId}';` : ''
    }\n${showIf(
      // handle Web Component styles
      Boolean(vineCompFnCtx.isCustomElement),
      `__vine.styles = [__${vineCompFnCtx.fnName.toLowerCase()}_styles];\n`,
    )}\nreturn __vine\n})();`)

    if (vineCompFnCtx.isExportDefault) {
      ms.appendRight(
        ms.length(),
        `\n\nexport default ${vineCompFnCtx.fnName};\n\n`,
      )
    }

    // Record component function to HMR
    if (isDev) {
      ms.appendRight(
        ms.length(),
        `\n\ntypeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(${vineCompFnCtx.fnName}.__hmrId, ${vineCompFnCtx.fnName});\n`,
      )
    }
  }

  // Prepend all style import statements
  ms.prepend(`\n${styleImportStmts.join('\n')}\n`)
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
