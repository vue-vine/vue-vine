import type { Language, VirtualFile } from '@volar/language-core'
import { FileCapabilities, FileKind, FileRangeCapabilities } from '@volar/language-core'
import type * as ts from 'typescript/lib/tsserverlibrary'
import type { VineCompilerHooks, VineDiagnostic, VineFileCtx } from '@vue-vine/compiler'
import { compileVineTypeScriptFile } from '@vue-vine/compiler'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { VINE_FILE_SUFFIX_REGEXP } from './constants'
import type { VineVirtualFileExtension } from './types'

function virtualFileName(
  sourceFileName: string,
  extension: VineVirtualFileExtension,
  extra?: string,
) {
  return `${
    sourceFileName.replace(VINE_FILE_SUFFIX_REGEXP, '')
  }${extra ? `.${extra}` : ''}.vine-virtual.${extension}`
}

export const language: Language<VineFile> = {
  createVirtualFile(fileName, snapshot) {
    if (VINE_FILE_SUFFIX_REGEXP.test(fileName)) {
      return new VineFile(fileName, snapshot)
    }
  },
  updateVirtualFile(vineFile, snapshot) {
    vineFile.update(snapshot)
  },
}

export class VineFile implements VirtualFile {
  kind = FileKind.TextFile
  capabilities = FileCapabilities.full

  fileName!: string
  mappings!: VirtualFile['mappings']
  codegenStacks = []
  embeddedFiles!: VirtualFile['embeddedFiles']
  textDocument!: TextDocument

  vineFileCtx!: VineFileCtx
  vineCompileErrs: VineDiagnostic[] = []
  vineCompileWarns: VineDiagnostic[] = []
  compilerHooks: VineCompilerHooks = {
    onError: err => this.vineCompileErrs.push(err),
    onWarn: warn => this.vineCompileWarns.push(warn),
  }

  constructor(
    public sourceFileName: string,
    public snapshot: ts.IScriptSnapshot,
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
      data: FileRangeCapabilities.full,
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
      const { start, end } = range
      const belongComp = fileCtx.vineFnComps.find(comp => comp.scopeId === scopeId)
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
          [
            // +1/-1 to skip the first/last quote
            start.index + 1,
            end.index - 1,
          ],
        ),
      )
    }
  }

  addEmbeddedTemplateFiles() {
    for (const vineFnCompCtx of this.vineFileCtx.vineFnComps) {
      const { template } = vineFnCompCtx
      const { source, range } = template

      this.embeddedFiles.push(
        this.createEmbeddedFile(
          source,
          virtualFileName(
            this.sourceFileName,
            'html',
            vineFnCompCtx.fnName ?? vineFnCompCtx.scopeId,
          ),
          [
            // +1/-1 to skip the first/last quote
            range.start.index + 1,
            range.end.index - 1,
          ],
        ),
      )
    }
  }
}
