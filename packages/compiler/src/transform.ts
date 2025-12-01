import type { SingleFnCompTransformCtx, TransformContext } from './transform/steps'
import type { VineCompilerHooks, VineFileCtx } from './types'
import { isBlockStatement } from '@babel/types'
import {
} from './constants'
import {
  createInlineTemplateComposer,
  createSeparatedTemplateComposer,
} from './template/compose'
import {
  buildSetupFormalParams,
  createVueImportsSpecs,
  generateAllImports,
  generateAsyncContext,
  generateBasicComponentOptions,
  generateDefineComponentWrapper,
  generateEmitsOptions,
  generatePropsDeclaration,
  generatePropsDestructure,
  generatePropsOptions,
  generatePropsRestProxy,
  generateSetupReturns,
  generateStyleImports,
  generateUseCssVars,
  generateVineExpose,
  generateVineFactory,
  generateVineModel,
  generateVinePropToRefs,
  generateVineSlots,
  onlyRemainFunctionBody,
  removeStatementsContainsMacro,
} from './transform/steps'

/**
 * Transform simple arrow functions without block statement body.
 * e.g., `export default () => vine\`...\``
 *
 * These functions have no setup logic, only a template.
 */
function transformSimpleArrowFunction(
  transformCtx: TransformContext,
  vineCompFnCtx: import('./types').VineCompFnCtx,
): void {
  const { vineFileCtx, compilerHooks, inline, ssr, mergedImportsMap, templateComposer } = transformCtx
  const ms = vineFileCtx.fileMagicCode
  const isDev = compilerHooks.getCompilerCtx().options.envMode !== 'production'

  const isExportDefaultAnonymous = vineCompFnCtx.isExportDefault && (vineCompFnCtx.fnName === 'default' || vineCompFnCtx.fnName === '')
  const tempVarName = isExportDefaultAnonymous ? '__VineCompDefault' : vineCompFnCtx.fnName
  const componentName = isExportDefaultAnonymous ? '__VineCompDefault' : vineCompFnCtx.fnName

  // Import defineComponent
  let vueImportsMeta = mergedImportsMap.get('vue')
  if (!vueImportsMeta) {
    vueImportsMeta = {
      type: 'namedSpecifier',
      specs: new Map(),
    }
    mergedImportsMap.set('vue', vueImportsMeta)
  }
  const vueImportsSpecs = (vueImportsMeta as any).specs
  if (!vueImportsSpecs.has('defineComponent')) {
    vueImportsSpecs.set('defineComponent', '_defineComponent')
  }

  // Compile template and get setup returns
  const setupReturns = templateComposer.compileSetupFnReturns({
    vineCompFnCtx,
    vineFileCtx,
    mergedImportsMap,
  })

  // Get render function from templateCompileResults
  const renderFn = templateComposer.templateCompileResults.get(vineCompFnCtx) || ''

  // Build component definition
  const exportPrefix = isExportDefaultAnonymous ? '' : 'export '

  const setupFn = inline
    ? ''
    : `setup(__props, { expose: __expose }) {
      __expose();
      return ${setupReturns};
    }`

  const renderFnAssignment = inline
    ? ''
    : `  ${renderFn}
  __vine.${ssr ? 'ssrRender' : 'render'} = ${ssr ? '__sfc_ssr_render' : '__sfc_render'};
`

  const hmrIdAssignment = isDev
    ? `  __vine.__hmrId = '${vineCompFnCtx.scopeId}';\n`
    : ''

  const hmrCreateRecord = (isDev && compilerHooks.getCompilerCtx().options.runtimeAdapter?.name !== 'rspack')
    ? `\n\ntypeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(${tempVarName}.__hmrId, ${tempVarName});\n`
    : ''

  const defaultExport = vineCompFnCtx.isExportDefault
    ? `\n\nexport default ${tempVarName};\n`
    : ''

  const generatedCode = `${exportPrefix}const ${tempVarName} = (() => {
  const __vine = _defineComponent({
    name: '${componentName}',
    ${setupFn}
  });
  ${renderFnAssignment}
  __vine.__vue_vine = true;
  ${hmrIdAssignment}
  return __vine;
})();${hmrCreateRecord}${defaultExport}`

  // Replace the entire function with generated component
  const fnStart = vineCompFnCtx.fnDeclNode.start!
  const fnEnd = vineCompFnCtx.fnDeclNode.end!
  ms.overwrite(fnStart, fnEnd, generatedCode)
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
  const templateComposer = inline // Get template composer based on inline option
    ? createInlineTemplateComposer(compilerHooks, ssr)
    : createSeparatedTemplateComposer(compilerHooks, ssr)
  const transformCtx: TransformContext = {
    inline,
    ssr,
    vineFileCtx,
    compilerHooks,
    mergedImportsMap: new Map(),
    templateComposer,
  }

  // Traverse all component functions and transform them into IIFE
  for (const vineCompFnCtx of vineFileCtx.vineCompFns) {
    const vineCompFnBody = vineCompFnCtx.fnItselfNode?.body
    if (!isBlockStatement(vineCompFnBody)) {
      transformSimpleArrowFunction(transformCtx, vineCompFnCtx)
      continue
    }

    const fnTransformCtx: SingleFnCompTransformCtx = {
      vineCompFnCtx,
      vineCompFnBody,
      vineCompFnStart: vineCompFnCtx.fnDeclNode.start!,
      vineCompFnEnd: vineCompFnCtx.fnDeclNode.end!,
      firstStmt: vineCompFnBody.body[0],
      lastStmt: vineCompFnBody.body[vineCompFnBody.body.length - 1],
      hasAwait: false,
      vueImportsSpecs: createVueImportsSpecs(
        transformCtx,
        vineCompFnCtx,
      ),

      isPrependedUseDefaults: false,
      isNeedUseDefaults: (
        Object
          .values(vineCompFnCtx.props)
          .some(meta => Boolean(meta.default))
      ),
    }

    onlyRemainFunctionBody(transformCtx, fnTransformCtx)
    removeStatementsContainsMacro(transformCtx, fnTransformCtx)
    generateVineSlots(transformCtx, fnTransformCtx)
    generateVineModel(transformCtx, fnTransformCtx)
    generateUseCssVars(transformCtx, fnTransformCtx)
    generateVinePropToRefs(transformCtx, fnTransformCtx)
    generatePropsRestProxy(transformCtx, fnTransformCtx)
    generatePropsDestructure(transformCtx, fnTransformCtx)
    generatePropsDeclaration(transformCtx, fnTransformCtx)
    generateAsyncContext(transformCtx, fnTransformCtx)
    generateVineExpose(transformCtx, fnTransformCtx)

    generateSetupReturns(transformCtx, fnTransformCtx)
    buildSetupFormalParams(transformCtx, fnTransformCtx)
    generateEmitsOptions(transformCtx, fnTransformCtx)
    generatePropsOptions(transformCtx, fnTransformCtx)
    generateBasicComponentOptions(transformCtx, fnTransformCtx)
    generateDefineComponentWrapper(transformCtx, fnTransformCtx)
    generateVineFactory(transformCtx, fnTransformCtx)
  }

  generateStyleImports(transformCtx)
  generateAllImports(transformCtx)
}
