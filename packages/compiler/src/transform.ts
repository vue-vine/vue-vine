import {
  isAssignmentExpression,
  isAwaitExpression,
  isBlockStatement,
  isExpressionStatement,
  isReturnStatement,
  isVariableDeclaration,
  traverse,
} from '@babel/types'
import type { AwaitExpression, Node } from '@babel/types'
import {
  CSS_VARS_HELPER,
  DEFINE_COMPONENT_HELPER,
  EXPECTED_ERROR,
  TO_REFS_HELPER,
  UN_REF_HELPER,
  USE_DEFAULTS_HELPER,
  USE_SLOT_HELPER,
} from './constants'
import { sortStyleImport } from './style/order'
import type { MergedImportsMap, NamedImportSpecifierMeta } from './template/compose'
import { createInlineTemplateComposer, createSeparatedTemplateComposer } from './template/compose'
import type { VineCompilerHooks, VineFileCtx } from './types'
import { filterJoin, showIf } from './utils'
import { isStatementContainsVineMacroCall } from './babel-helpers/ast'
import { compileCSSVars } from './style/transform-css-var'

function wrapWithAsyncContext(
  isNeedResult: boolean,
  exprSourceCode: string,
) {
  return isNeedResult
    ? `;(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    await __temp,
    __restore()
  );`
    : `;(
    ([__temp,__restore] = _withAsyncContext(() => ${exprSourceCode})),
    __temp = await __temp,
    __restore(),
    __temp
  );`
}

function mayContainAwaitExpr(targetNode: Node) {
  let awaitExpr: AwaitExpression | undefined
  if (!(
    isVariableDeclaration(targetNode)
    || isAssignmentExpression(targetNode)
    || isExpressionStatement(targetNode)
  )) {
    return false
  }
  try {
    traverse(targetNode, (descendant) => {
      if (isAwaitExpression(descendant)) {
        awaitExpr = descendant
        throw new Error(EXPECTED_ERROR)
      }
    })
  }
  catch (error) {
    if (error === EXPECTED_ERROR) {
      return awaitExpr
    }
    throw error
  }
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
) {
  const isDev = compilerHooks.getCompilerCtx().options.envMode !== 'production'
  const ms = vineFileCtx.fileMagicCode
  // Traverse file context's `styleDefine`, and generate import statements.
  // Ordered by their import releationship.
  const styleImportStmts = sortStyleImport(vineFileCtx)
  const mergedImportsMap: MergedImportsMap = new Map()
  const {
    templateCompileResults,
    generatedPreambleStmts,
    compileSetupFnReturns,
  } = inline // Get template composer based on inline option
    ? createInlineTemplateComposer(compilerHooks)
    : createSeparatedTemplateComposer(compilerHooks)

  let isPrependedUseDefaults = false
  for (const vineCompFnCtx of vineFileCtx.vineCompFns) {
    const setupFnReturns = compileSetupFnReturns({
      vineFileCtx,
      vineCompFnCtx,
      templateSource: vineCompFnCtx.templateSource,
      mergedImportsMap,
      bindingMetadata: vineCompFnCtx.bindings,
    })
    const isNeedUseDefaults = Object.values(vineCompFnCtx.props).some(meta => Boolean(meta.default))

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
      inline && vueImportsSpecs.set(UN_REF_HELPER, `_${UN_REF_HELPER}`)
    }
    // add useSlots
    if (Object.entries(vineCompFnCtx.slots).length > 0) {
      vueImportsSpecs.set(USE_SLOT_HELPER, `_${USE_SLOT_HELPER}`)
    }

    const vineCompFnStart = vineCompFnCtx.fnDeclNode.start!
    const vineCompFnEnd = vineCompFnCtx.fnDeclNode.end!
    const vineCompFnBody = vineCompFnCtx.fnItselfNode!.body
    if (isBlockStatement(vineCompFnBody)) {
      let hasAwait = false

      for (const vineFnBodyStmt of vineCompFnBody.body) {
        const isContained = mayContainAwaitExpr(vineFnBodyStmt)
        if (!isContained) {
          continue
        }
        hasAwait = true
        ms.update(
          vineFnBodyStmt.start!,
          vineFnBodyStmt.end!,
          wrapWithAsyncContext(
            isExpressionStatement(vineFnBodyStmt),
            ms.original.slice(
              vineFnBodyStmt.start!,
              vineFnBodyStmt.end!,
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
          field: 'emits',
          alias: vineCompFnCtx.emitsAlias,
        })
      }
      if (vineCompFnCtx.expose) {
        setupCtxDestructFormalParams.push({
          field: 'expose',
          alias: '__expose',
        })
      }
      let setupFormalParams = `__props${
        setupCtxDestructFormalParams.length > 0
          ? `, { ${
            setupCtxDestructFormalParams.map(
              ({ field, alias }) => `${field}${showIf(Boolean(alias), `: ${alias}`)}`,
            ).join(', ')
          } }`
          : ' /* No setup ctx destructuring */'
      }`
      if (Object.values(vineCompFnCtx.props).some(meta => Boolean(meta.isFromMacroDefine))) {
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

      // vineSlots
      if (Object.entries(vineCompFnCtx.slots).length > 0) {
        ms.prependLeft(
          firstStmt.start!,
          `const ${vineCompFnCtx.slotsAlias} = _${USE_SLOT_HELPER}();\n`,
        )
      }

      // Insert `useCssVars` helper function call
      if (Array.from(
        Object.entries(vineCompFnCtx.cssBindings),
      ).length > 0) {
        ms.prependLeft(
          firstStmt.start!,
          `\n${compileCSSVars(vineCompFnCtx, inline)}\n`,
        )
      }

      // Insert `useDefaults` helper function import specifier.
      // And prepend `const __props = useDefaults(...)` before the first statement.
      let propsDeclarationStmt = `const ${vineCompFnCtx.propsAlias} = __props;`
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
            .map(([propName, propMeta]) => `  ${propName}: ${
              ms.original.slice(
                propMeta.default!.start!,
                propMeta.default!.end!,
              )
            }`).join(',\n')
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
      ms.appendRight(
        lastStmt.end!,
        `${
          vineCompFnCtx.expose
            ? `\n__expose(${
              ms.original.slice(
                vineCompFnCtx.expose.start!,
                vineCompFnCtx.expose.end!,
              )
            })`
            : '/* No expose */'
        }\n`,
      )

      // Insert setup function's return statement
      ms.appendRight(lastStmt.end!, `\nreturn ${setupFnReturns};`)

      ms.prependLeft(firstStmt.start!, `setup(${setupFormalParams}) {\n`)
      ms.appendRight(lastStmt.end!, '\n}')
      ms.prependLeft(firstStmt.start!, `const __vine = _defineComponent({\n${
        vineCompFnCtx.options
          ? `...${ms.original.slice(
            vineCompFnCtx.options.start!,
            vineCompFnCtx.options.end!,
          )},`
          : `name: '${vineCompFnCtx.fnName}',`
      }\n${
        Object.keys(vineCompFnCtx.props).length > 0
          ? `props: {\n${
            Object.entries(vineCompFnCtx.props).map(([propName, propMeta]) => {
              const metaFields = []
              if (propMeta.isRequired) {
                metaFields.push('required: true')
              }
              if (propMeta.isBool) {
                metaFields.push('type: Boolean')
              }
              if (propMeta.validator) {
                metaFields.push(`validator: ${
                  ms.original.slice(
                    propMeta.validator.start!,
                    propMeta.validator.end!,
                  )
                }`)
              }
              return `${propName}: { ${
                showIf(
                  metaFields.filter(Boolean).length > 0,
                  filterJoin(metaFields, ', '),
                  '/* Simple prop */',
                )
              } },`
            }).join('\n')
          }\n},`
          : '/* No props */'
      }\n${
        vineCompFnCtx.emits.length > 0
          ? `emits: [${vineCompFnCtx.emits.map(emit => `'${emit}'`).join(', ')}],`
          : '/* No emits */'
      }\n`)
      ms.appendRight(lastStmt.end!, '\n})')
      // Defaultly set `export` for all component functions
      // because it's required by HMR context.
      ms.prependLeft(firstStmt.start!, `\nexport const ${
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
          }\n__vine.render = __sfc_render`
      }\n${
        showIf(
          Boolean(vineFileCtx.styleDefine[vineCompFnCtx.scopeId]),
          `__vine.__scopeId = 'data-v-${vineCompFnCtx.scopeId}';\n${
            isDev ? `__vine.__hmrId = '${vineCompFnCtx.scopeId}';` : ''
          }\n`,
        )}${showIf(
          // handle Web Component styles
          Boolean(vineCompFnCtx.isCustomElement),
          `__vine.styles = [__${vineCompFnCtx.fnName.toLowerCase()}_styles];\n`,
        )}\nreturn __vine\n})();`)
      // Record component function to HMR
      if (isDev) {
        ms.appendRight(
          ms.length(),
          `\n\ntypeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(${vineCompFnCtx.fnName}.__hmrId, ${vineCompFnCtx.fnName});\n`,
        )
      }
    }
  }

  // HMR
  if (isDev) {
    ms.appendRight(
      ms.length(),
      `export const _rerender_only = ${vineFileCtx.renderOnly}
export const _rerender_vcf_fn_name = ${vineFileCtx.hmrCompFnsName ? `"${vineFileCtx.hmrCompFnsName!}"` : '""'}
import.meta.hot.accept((mod) => {
if (!mod){return;}
const { _rerender_only, _rerender_vcf_fn_name } = mod;
if (!_rerender_vcf_fn_name){return;}
const component = mod[_rerender_vcf_fn_name];
if (_rerender_only) {
  __VUE_HMR_RUNTIME__.rerender(component.__hmrId, component.render);
} else {
  __VUE_HMR_RUNTIME__.reload(component.__hmrId, component);
}
});`,
    )
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
