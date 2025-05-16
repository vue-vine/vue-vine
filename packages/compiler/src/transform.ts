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
