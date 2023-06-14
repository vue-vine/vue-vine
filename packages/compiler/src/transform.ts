import type { SgNode } from '@ast-grep/napi'
import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineFileCtx } from './types'
import { VineBindingTypes } from './types'
import { STYLE_LANG_FILE_EXTENSION } from './constants'
import { filterJoin, showIf, spaces } from './utils'
import { CSS_VARS_HELPER, compileCSSVars } from './style/transform-css-vars'
import { createInlineTemplateComposer, createSeparateTemplateComposer } from './template/compose'

type SetupCtxProperty = 'expose' | 'emits'
const MAY_CONTAIN_AWAIT_STMT_KINDS: [kind: string, needResult: boolean][] = [
  ['lexical_declaration', true],
  ['assignment_expression', true],
  ['expression_statement', false],
]

function mayTransformAwaitExprInsideStmt(targetNode: SgNode) {
  const findMatchContain = MAY_CONTAIN_AWAIT_STMT_KINDS.find(([kind]) => kind === targetNode.kind())
  if (!findMatchContain) {
    return targetNode.text()
  }
  const reparsedAst = ts.parse(targetNode.text()).root()
  const awaitExpr = reparsedAst.find({
    rule: { pattern: 'await $EXPR' },
  })
  if (!awaitExpr) {
    return targetNode.text()
  }
  // This is to maintain operatable position for replacement
  const ms = new MagicString(targetNode.text())
  const exprNode = awaitExpr.children()[1]
  const exprSourceCode = exprNode.text()
  const [, needResult] = findMatchContain
  const transformedExpr
    = needResult
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
)`
  ms.update(
    awaitExpr.range().start.index,
    awaitExpr.range().end.index,
    transformedExpr,
  )

  return ms.toString()
}

export function transformFile(
  vineFileCtx: VineFileCtx,
  inline = true,
) {
  // Processing for .vine.ts File is divided into two parts:
  // 1. Manage all hoisted static code, including:
  //   1.1 Imports
  //   1.2 Hoist setup statements
  //   (And all the top level statements will be remain as is)
  // 2. Transform all vine component functions into an IIFE for creating Vue component objects

  // Q: Why IIFE?:
  // A: Because @vue/compiler-dom hoisting feature will generate variables like `__hoisted_1`,
  //    But there may be multiple components in .vine.ts, so hoisting variable may be conflicted,
  //    But we can wrap each component function with an IIFE, creating a lexical scope to isolate.

  // The following is a description for details:

  // 1. Traverse all `VineFnCompCtx`, use `bindings`
  //    to compile template, and generate `preamble` and `code`.

  //     1.1 In those generated `preamble`, there will be duplicated imports,
  //        so we need to use ast-grep to parse it, and do deduplicate by
  //        analyzing their `import_specifier`.
  let isPrependedUseDefaults = false
  const styleImportStmts: string[] = []
  const generatedImportsMap: Map<string, Map<string, string>> = new Map()
  const inFileCompSharedBindings = Object.fromEntries(
    vineFileCtx.vineFnComps.map(vineFnCompCtx => ([
      vineFnCompCtx.fnName,
      VineBindingTypes.SETUP_CONST,
    ])),
  )

  // Get template composer based on inline option
  const {
    templateCompileResults,
    notImportPreambleStmtStore,
    runTemplateCompile,
  } = inline
    ? createInlineTemplateComposer()
    : createSeparateTemplateComposer()

  for (const vineFnCompCtx of vineFileCtx.vineFnComps) {
    const templateSource = vineFnCompCtx.template.text().slice(1, -1) // skip quotes
    const bindingMetadata = {
      scriptBindings: vineFnCompCtx.bindings,
      fileSharedCompBindings: inFileCompSharedBindings,
    }

    const setupFnReturns = runTemplateCompile({
      vineFileCtx,
      vineFnCompCtx,
      generatedImportsMap,
      templateSource,
      allBindings: bindingMetadata,
    })

    // Add `defineComponent` helper function import specifier
    let vueImports = generatedImportsMap.get('vue')
    if (!vueImports) {
      const specs = new Map()
      generatedImportsMap.set('vue', specs)
      vueImports = specs
    }
    if (!vueImports.has('defineComponent')) {
      vueImports.set('defineComponent', '_defineComponent')
    }
    // add useCssVars
    if (!vueImports.has(CSS_VARS_HELPER) && vineFnCompCtx.cssBindings) {
      vueImports.set(CSS_VARS_HELPER, `_${CSS_VARS_HELPER}`)
    }

    // 2. For every vine component function, we need to transform the function declaration
    //    (no matter what kind of declaration it is) into an IIFE, return a real Vue component object.

    //    So first we need to cut out the whole function declaration by magic-string,
    //    and ready to generate the component object code.

    //    2.1 Component has `options`? If so, we just spread it into component object.

    //    2.2 For props, use previously collected meta information
    //
    //        2.2.1 Generate `props` field, contains every prop definition object. For example:
    //        ```
    //        props: {
    //          foo: { required: true },
    //                       ^ Based on `isRequired`
    //          bar: { type: Boolean, validator: (value) => ... },
    //                       ^ Based on `isBool`
    //        }
    //        ```
    //        2.2.2 If any prop has default value, check 2.4.2 for more details.

    //    2.3 Generate `emits: ['foo', 'bar', ...]`
    //                         ^ Based on `vineFnCompCtx.emits`

    //    2.4 Generate `setup` function, and put all `insideSetupStmts` into it.
    //
    //        Check if there's any `await` statement in `insideSetupStmts`,
    //        if so, generate `async` keyword for `setup` function,
    //        and generate `_withAsyncContext` helper to wrap those async calls.
    const { insideSetupStmts } = vineFnCompCtx
    const insideSetupStmtCode: string[] = []
    for (const stmt of insideSetupStmts) {
      const stmtSourceCode = mayTransformAwaitExprInsideStmt(stmt)
      insideSetupStmtCode.push(stmtSourceCode)
    }

    //        2.4.1 Generate setup function's formal parameter list,
    //              first one must be `__props`, and the other one is an object destructurt,
    //              which may pick out `emit` and `expose` if corresponding macro is used.
    const setupCtxDestructFormalParams: {
      field: SetupCtxProperty
      alias?: string
    }[] = []
    if (vineFnCompCtx.emits.length > 0) {
      setupCtxDestructFormalParams.push({
        field: 'emits',
        alias: vineFnCompCtx.emitsAlias,
      })
    }
    if (vineFnCompCtx.expose) {
      setupCtxDestructFormalParams.push({
        field: 'expose',
      })
    }

    //        2.4.2 If there're any props have default value, it's required to generate `useDefaults`
    //              inside `setup` function. `useDefaults` is an helper function which should be imported from 'vue-vine'.
    //              ```
    //              // This import statement should also be hoisted in 1.2
    //              import { useDefaults } from 'vue-vine'
    //
    //              const props = useDefaults(__props, {
    //                     ^ This is `propAlias`
    //                foo: 'bar'
    //                // Function are required for object, array, and function default values
    //                zig:  () => { return 'zag' }
    //                arr:  () => { return [1, 2] }
    //                func: () => { return (...args) => { ... } }
    //                                     ^ These return values are from `VinePropMeta.default.text()`
    //              })
    //              ```
    //              If there's no need for `default`, just generate `const props = __props`, same as SFC compilation.
    let propsUseDefaultsStmt = 'const props = __props'
    if (Object.values(vineFnCompCtx.props).some(meta => Boolean(meta.default))) {
      if (!isPrependedUseDefaults) {
        // Import helper function
        vineFileCtx.fileSourceCode.prepend('import { useDefaults as _useDefaults } from "vue-vine"\n')
        isPrependedUseDefaults = true
      }

      propsUseDefaultsStmt = `const ${vineFnCompCtx.propsAlias} = _useDefaults(__props, {\n${
        Object.entries(vineFnCompCtx.props)
          .filter(([_, propMeta]) => Boolean(propMeta.default))
          .map(([propName, propMeta]) => {
            return `${spaces(2)}${propName}: ${propMeta.default!.text()}`
          }).join(',\n')
      }\n})\n`
    }
    const propsFromMacro = Object.entries(vineFnCompCtx.props)
      .filter(([_, propMeta]) => Boolean(propMeta.isFromMacroDefine))
      .map(([propName]) => propName)
    if (propsFromMacro.length > 0) {
      vueImports.set('toRefs', '_toRefs')
    }

    //        2.4.3 Just put all `insideSetupStmts` into `setup` function's body.
    //        2.4.4 Generate `expose` call based on the same logic as Vue SFC
    //              by using the collected `expose` argument object's fields.
    //        2.4.5 Use the generated inline template render function from 1. `code`,
    //              and make a return statement for the setup function.
    //    2.5 Prepend statements which're not import statements or belongs to `hoistSetupStmts`
    //        to the component object IIFE.
    const { fnDeclNode, fnName } = vineFnCompCtx
    const {
      start: vineFnDeclStart,
      end: vineFnDeclEnd,
    } = fnDeclNode.range()
    vineFileCtx.fileSourceCode.remove(
      vineFnDeclStart.index,
      vineFnDeclEnd.index,
    )

    const isNeedAsync = vineFnCompCtx.isAsync || vineFnCompCtx.setupStmts.some(
      stmt => Boolean(stmt.find(ts.kind('await_expression'))),
    )
    const hoisted = [
      ...notImportPreambleStmtStore.get(vineFnCompCtx) ?? [],
      ...vineFnCompCtx.hoistSetupStmts,
    ]

    //    2.6 Traverse file context's `styleDefine`, and generate import statements for everyone.
    const styleDefine = vineFileCtx.styleDefine[vineFnCompCtx.scopeId]
    if (styleDefine) {
      styleImportStmts.push(
        `import '${
          vineFileCtx.fileId.replace(/\.vine\.ts$/, '')
        }?type=vine-style&scopeId=${
          vineFnCompCtx.scopeId
        }&lang=${
          styleDefine.lang
        }${
          showIf(
            Boolean(styleDefine.scoped),
            '&scoped=true',
          )
        }&virtual.${
          STYLE_LANG_FILE_EXTENSION[styleDefine.lang]
        }'`,
      )
    }

    // Do codegen for single component
    vineFileCtx.fileSourceCode.appendRight(
      vineFnDeclStart.index, `
${showIf(vineFnCompCtx.isExport, 'export ')}const ${fnName} = (() => {

${
  hoisted.length > 0
    ? hoisted
      .map(
        item => typeof item === 'string'
          ? item
          : item.text(),
      ).join('\n')
    : '/* No hoisted */'
}

  const __vine = _defineComponent({
    ${
      vineFnCompCtx.options
        ? `...${vineFnCompCtx.options?.text().replace(/\n/g, '')},`
        : `name: '${vineFnCompCtx.fnName}',`
    }
    ${showIf(
      Object.entries(vineFnCompCtx.props).length > 0,
      `props: {\n${
        Object.entries(vineFnCompCtx.props).map(([propName, propMeta]) => {
          const metaFields = [
            showIf(Boolean(propMeta.isRequired), 'required: true'),
            showIf(Boolean(propMeta.isBool), 'type: Boolean'),
            showIf(Boolean(propMeta.validator), `validator: ${propMeta.validator?.text()}`),
          ]
          return `${spaces(6)}${propName}: { ${
            showIf(
              metaFields.filter(Boolean).length > 0,
              filterJoin(metaFields, ', '),
              '/* Simple prop */',
            )
          } },`
        }).join('\n')
      }\n${spaces(4)}},`,
      '/* No props */',
    )}
    ${showIf(
      vineFnCompCtx.emits.length > 0,
      `emits: [\n${
        vineFnCompCtx.emits.map(emitName => `${spaces(6)}'${emitName}'`).join(',\n')
      }\n${spaces(4)}],`,
      '/* No emits */',
    )}
    ${showIf(isNeedAsync, 'async ')}setup(__props${
      setupCtxDestructFormalParams.length > 0
        ? `, { ${setupCtxDestructFormalParams.map(({ field, alias }) => {
          return `${field}${showIf(Boolean(alias), `: ${alias}`)}`
          }).join(', ')} }`
        : ' /* No setup ctx destructuring */'
    }) {

${propsUseDefaultsStmt}
${showIf(
  propsFromMacro.length > 0,
  `const { ${propsFromMacro.join(',')} } = _toRefs(${vineFnCompCtx.propsAlias})`,
)}

${compileCSSVars(vineFnCompCtx)}

${insideSetupStmtCode.join('\n')}

${
  vineFnCompCtx.expose
    ? `expose(${
        vineFnCompCtx.expose.text()
      })`
    : '/* No expose */'
}

return ${setupFnReturns}

    }, // End of setup function
  }) // End of component object

${showIf(
    // Not-inline mode, append the standalone template render function
    // after the component object, and mount the field `render` to it.
    !inline,
    `
${templateCompileResults.get(vineFnCompCtx) ?? ''}
__vine.render = __sfc_render
    `,
)}

  ${showIf(
    Boolean(vineFileCtx.styleDefine[vineFnCompCtx.scopeId]),
    `__vine.__scopeId = 'data-v-${vineFnCompCtx.scopeId}'`,
  )}
  return __vine /* End of ${vineFnCompCtx.fnName} */
})()`)
  }

  // Merge deduplicated imports in all `preamble` into a single import statement,
  // put it with other imports in this file together and make sure they're hoisted to the top.
  const mergedImports = [...generatedImportsMap.entries()]
    .map(([source, specPairsMap]) => {
      return `import {\n${
        [...specPairsMap.entries()]
          .map(([spec, alias]) => {
            return `${spaces(2)}${spec}${showIf(Boolean(alias), ` as ${alias}`)}`
          })
          .join(',\n')
      }\n} from '${source}'`
    })
    .join('\n')

  vineFileCtx.fileSourceCode.prepend(`${
    mergedImports
  }\n${
    styleImportStmts.join('\n')
  }\n\n`)
}
