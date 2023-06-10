import type { BindingMetadata, CompilerOptions } from '@vue/compiler-dom'
import { compile } from '@vue/compiler-dom'
import { ts } from '@ast-grep/napi'
import type { VineFnCompCtx } from '../types'
import { ruleImportSpecifier, ruleImportStmt } from '../ast-grep/rules-for-script'

function compileVineTemplate(
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
    vineFnCompCtx: VineFnCompCtx
    importsMap: Map<string, Map<string, string>>
    templateSource: string
    bindingMetadata: BindingMetadata
  }) => void
  templateCompileResults: WeakMap<VineFnCompCtx, string>
  notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]>
}

export function createInlineTemplateComposer(): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineFnCompCtx, string> = new WeakMap()
  const notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    notImportPreambleStmtStore,
    runTemplateCompile: ({
      vineFnCompCtx,
      importsMap,
      templateSource,
      bindingMetadata,
    }) => {
      const compileResult = compileVineTemplate(
        templateSource,
        {
          scopeId: `data-v-${vineFnCompCtx.scopeId}`,
          bindingMetadata,
        },
      )

      // For inline mode, we can directly store the generated code,
      // it's an inline render function
      templateCompileResults.set(vineFnCompCtx, compileResult.code)

      const { preamble } = compileResult
      const preambleSgRoot = ts.parse(preamble).root()
      const allImportStmts = preambleSgRoot.findAll(ruleImportStmt)
      for (const importStmt of allImportStmts) {
        const allImportSpecs = importStmt.findAll(ruleImportSpecifier)
        const source = importStmt.field('source')!.text().slice(1, -1) // remove quotes
        for (const importSpec of allImportSpecs) {
          const importName = importSpec.field('name')!
          const importAlias = importSpec.field('alias')
          const specPairs = importsMap.get(source)
          if (!specPairs) {
            const newSpecPairs = new Map<string, string>()
            newSpecPairs.set(
              importName.text(),
              importAlias?.text() ?? importName.text(),
            )
            importsMap.set(
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

      const allOtherStmts = preambleSgRoot.children().filter(
        child => child.kind() !== 'import_statement',
      )
      for (const otherStmt of allOtherStmts) {
        notImportPreambleStmtStore.set(
          vineFnCompCtx,
          [
            ...(notImportPreambleStmtStore.get(vineFnCompCtx) ?? []),
            otherStmt.text(),
          ],
        )
      }
    },
  }
}

export function createSeparateTemplateComposer(): TemplateCompileComposer {
  const templateCompileResults: WeakMap<VineFnCompCtx, string> = new WeakMap()
  const notImportPreambleStmtStore: WeakMap<VineFnCompCtx, string[]> = new WeakMap()

  return {
    templateCompileResults,
    notImportPreambleStmtStore,
    runTemplateCompile: ({
      vineFnCompCtx,
      importsMap,
      templateSource,
      bindingMetadata,
    }) => {
      // Todo ...
      // Handle for not-inline mode
    },
  }
}
