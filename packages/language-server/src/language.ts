import { posix as path } from 'node:path'
import type { Language, VirtualFile } from '@volar/language-core'
import { FileCapabilities, FileKind, FileRangeCapabilities, MirrorBehaviorCapabilities } from '@volar/language-core'
import { buildMappings } from '@volar/source-map'
import type { VineCompilerHooks, VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'
import { compileVineTypeScriptFile } from '@vue-vine/compiler'
import { resolveVueCompilerOptions } from '@vue/language-core'
import { generate as generateTemplate } from '@vue/language-core/out/generators/template'
import * as muggle from 'muggle-string'
import type * as ts from 'typescript/lib/tsserverlibrary'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { VINE_FILE_SUFFIX_REGEXP } from './constants'
import type { VineVirtualFileExtension } from './types'
import { getTypesCode } from './globalTypes'

function virtualFileName(
  sourceFileName: string,
  extension: VineVirtualFileExtension,
  extra?: string,
) {
  return `${sourceFileName.replace(VINE_FILE_SUFFIX_REGEXP, '')
    }${extra ? `.${extra}` : ''}.vine-virtual.${extension}`
}

export function createLanguage(ts: typeof import('typescript/lib/tsserverlibrary')) {
  const language: Language<VineFile> = {
    createVirtualFile(fileName, snapshot) {
      if (VINE_FILE_SUFFIX_REGEXP.test(fileName)) {
        return new VineFile(fileName, snapshot, ts)
      }
    },
    updateVirtualFile(vineFile, snapshot) {
      vineFile.update(snapshot)
    },
    resolveHost(host) {
      const sharedTypesSnapshot = ts.ScriptSnapshot.fromString(getTypesCode())
      const sharedTypesFileName = path.join(host.rootPath, '__VLS_types.d.ts')
      return {
        ...host,
        getScriptFileNames() {
          return [
            sharedTypesFileName,
            ...host.getScriptFileNames(),
          ]
        },
        getScriptSnapshot(fileName) {
          if (fileName === sharedTypesFileName) {
            return sharedTypesSnapshot
          }
          return host.getScriptSnapshot(fileName)
        },
      }
    },
  }
  return language
}

export class VineFile implements VirtualFile {
  kind = FileKind.TextFile
  capabilities = {
    diagnostic: true,
  }

  fileName!: string
  mappings!: VirtualFile['mappings']
  codegenStacks = []
  embeddedFiles!: VirtualFile['embeddedFiles']
  textDocument!: TextDocument

  vineFileCtx!: VineFileCtx
  vineCompileErrs: VineDiagnostic[] = []
  vineCompileWarns: VineDiagnostic[] = []
  compilerHooks: VineCompilerHooks = {
    onOptionsResolved: cb => cb({
      inlineTemplate: false,
    }),
    onError: err => this.vineCompileErrs.push(err),
    onWarn: warn => this.vineCompileWarns.push(warn),
  }

  constructor(
    public sourceFileName: string,
    public snapshot: ts.IScriptSnapshot,
    public ts: typeof import('typescript/lib/tsserverlibrary'),
  ) {
    this.fileName = virtualFileName(sourceFileName, 'ts')
    this.onSnapshotUpdated()
  }

  public update(newSnapshot: ts.IScriptSnapshot) {
    this.snapshot = newSnapshot
    this.onSnapshotUpdated()
  }

  mustRunOnSnapshotUpdated() {
    this.embeddedFiles = []
    this.vineCompileErrs = []
    this.vineCompileWarns = []

    this.mappings = [{
      sourceRange: [0, this.snapshot.getLength()],
      generatedRange: [0, this.snapshot.getLength()],
      data: {
        diagnostic: true,
      },
    }]
    this.textDocument = TextDocument.create(
      this.fileName,
      'vine',
      0,
      this.snapshot.getText(0, this.snapshot.getLength()),
    )
    this.vineFileCtx = compileVineTypeScriptFile(
      this.snapshot.getText(0, this.snapshot.getLength()),
      this.sourceFileName,
      this.compilerHooks,
    )
  }

  onSnapshotUpdated() {
    this.mustRunOnSnapshotUpdated()
    this.addEmbeddedStyleFiles()
    this.addEmbeddedTemplateFiles()
    this.addEmbeddedTsFile()
  }

  createEmbeddedFile(
    source: string,
    vFileName: string,
    range: [number, number],
  ): VirtualFile {
    return {
      fileName: vFileName,
      kind: FileKind.TextFile,
      snapshot: {
        getText: (start, end) => source.slice(start, end),
        getLength: () => source.length,
        getChangeRange: () => undefined,
      },
      mappings: [{
        sourceRange: range,
        generatedRange: [0, source.length],
        data: FileRangeCapabilities.full,
      }],
      codegenStacks: [],
      capabilities: FileCapabilities.full,
      embeddedFiles: [],
    }
  }

  addEmbeddedStyleFiles() {
    for (const [scopeId, styleDefine] of Object.entries(this.vineFileCtx.styleDefine)) {
      const { lang, source, range, fileCtx } = styleDefine
      const [start, end] = range!
      const belongComp = fileCtx.vineCompFns.find(comp => comp.scopeId === scopeId)
      const virtualFileExt: VineVirtualFileExtension = (() => {
        switch (lang) {
          case 'css':
          case 'postcss':
            return 'css'
          case 'stylus':
            return 'styl'
          default:
            return lang
        }
      })()

      this.embeddedFiles.push(
        this.createEmbeddedFile(
          source,
          virtualFileName(
            this.sourceFileName,
            virtualFileExt,
            belongComp?.fnName ?? scopeId,
          ),
          // +1/-1 to skip the first/last quote
          [start + 1, end - 1],
        ),
      )
    }
  }

  addEmbeddedTemplateFiles() {
    for (const vineFnCompCtx of this.vineFileCtx.vineCompFns) {
      const { templateSource, templateStringNode } = vineFnCompCtx
      this.embeddedFiles.push(
        this.createEmbeddedFile(
          templateSource,
          virtualFileName(
            this.sourceFileName,
            'html',
            vineFnCompCtx.fnName ?? vineFnCompCtx.scopeId,
          ),
          // +1/-1 to skip the first/last quote
          [
            templateStringNode!.quasi.quasis[0]!.start! + 1,
            templateStringNode!.quasi.quasis[0]!.end! - 1,
          ],
        ),
      )
    }
  }

  addEmbeddedTsFile() {
    let lastCodeOffset = 0
    const codes: muggle.Segment<FileRangeCapabilities>[] = []
    const mirrorBehaviorMappings: NonNullable<VirtualFile['mirrorBehaviorMappings']> = []

    for (const vineFnCompCtx of this.vineFileCtx.vineCompFns) {
      const { templateStringNode, templateSource, templateAst } = vineFnCompCtx
      const start = templateStringNode!.start!
      const end = templateStringNode!.end!
      const offset = start + 5 // 5 = 'vine`'.length

      codes.push([
        this.snapshot.getText(lastCodeOffset, start),
        undefined,
        lastCodeOffset,
        FileRangeCapabilities.full,
      ])
      codes.push('(() => {\n')
      const generatedTemplate = generateTemplate(
        this.ts as any,
        {},
        resolveVueCompilerOptions({}),
        templateSource,
        'html',
        {
          styles: [],
          templateAst,
        } as any,
        false,
        false,
      )

      codes.push('const __VLS_ctx = reactive({')
      for (const id of [
        ...generatedTemplate.identifiers,
        ...Object.keys(generatedTemplate.tagNames),
      ]) {
        const leftOffset = muggle.getLength(codes)
        codes.push(`${id}: `)
        const rightOffset = muggle.getLength(codes)
        codes.push(`${id}, `)
        mirrorBehaviorMappings.push({
          sourceRange: [leftOffset, leftOffset + id.length],
          generatedRange: [rightOffset, rightOffset + id.length],
          data: [MirrorBehaviorCapabilities.full, MirrorBehaviorCapabilities.full],
        })
      }
      codes.push('} as VueVineComponent);\n')

      const transformedTemplateCode = generatedTemplate.codes.map<muggle.Segment<FileRangeCapabilities>>(code =>
        typeof code === 'string'
          ? code
          : [code[0], undefined, typeof code[2] === 'number'
              ? code[2] + offset
              : [code[2][0] + offset, code[2][1] + offset], code[3]],
      )
      codes.push(...transformedTemplateCode)
      codes.push('})')

      lastCodeOffset = end
    }

    codes.push([
      this.snapshot.getText(lastCodeOffset, this.snapshot.getLength()),
      undefined,
      lastCodeOffset,
      FileRangeCapabilities.full,
    ])

    const generated = muggle.toString(codes)

    this.embeddedFiles.push(
      {
        fileName: virtualFileName(
          this.sourceFileName,
          'ts',
          'vls',
        ),
        kind: FileKind.TypeScriptHostFile,
        snapshot: {
          getText: (start, end) => generated.slice(start, end),
          getLength: () => generated.length,
          getChangeRange: () => undefined,
        },
        mappings: buildMappings(codes),
        mirrorBehaviorMappings,
        codegenStacks: [],
        capabilities: FileCapabilities.full,
        embeddedFiles: [],
      },
    )
  }
}
