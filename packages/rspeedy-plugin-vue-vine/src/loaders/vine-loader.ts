// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { LoaderContext } from '@rspack/core'
import type { VineCompilerCtx, VineCompilerHooks } from '@vue-vine/compiler'
import process from 'node:process'
import { compileVineTypeScriptFile, createCompilerCtx } from '@vue-vine/compiler'

export interface VineLoaderOptions {
  /**
   * Enable Lynx mode for the compiler
   */
  lynxEnabled?: boolean
}

// Shared compiler context across all .vine.ts files
let sharedCompilerCtx: VineCompilerCtx | null = null

function getCompilerCtx(): VineCompilerCtx {
  if (!sharedCompilerCtx) {
    sharedCompilerCtx = createCompilerCtx({
      envMode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      lynx: { enabled: true },
    })
  }
  return sharedCompilerCtx
}

function createCompilerHooks(compilerCtx: VineCompilerCtx): VineCompilerHooks {
  return {
    getCompilerCtx: () => compilerCtx,
    onError: (err) => {
      compilerCtx.vineCompileErrors.push(err)
    },
    onWarn: (warn) => {
      compilerCtx.vineCompileWarnings.push(warn)
    },
    onBindFileCtx: (fileId, fileCtx) => {
      compilerCtx.fileCtxMap.set(fileId, fileCtx)
    },
  }
}

/**
 * Webpack/Rspack loader for .vine.ts files
 */
export default function vineLoader(
  this: LoaderContext<VineLoaderOptions>,
  source: string,
): void {
  const callback = this.async()
  const fileId = this.resourcePath

  try {
    const compilerCtx = getCompilerCtx()
    const compilerHooks = createCompilerHooks(compilerCtx)

    // Compile the .vine.ts file
    const vineFileCtx = compileVineTypeScriptFile(
      source,
      fileId,
      { compilerHooks },
    )

    // Check for compilation errors
    if (compilerCtx.vineCompileErrors.length > 0) {
      const errors = compilerCtx.vineCompileErrors.map(e => e.full || e.msg).join('\n')
      compilerCtx.vineCompileErrors.length = 0
      callback(new Error(`Vue Vine compilation failed:\n${errors}`))
      return
    }

    // Log warnings
    if (compilerCtx.vineCompileWarnings.length > 0) {
      for (const warn of compilerCtx.vineCompileWarnings) {
        this.emitWarning(new Error(warn.full || warn.msg))
      }
      compilerCtx.vineCompileWarnings.length = 0
    }

    // Get transformed code
    const transformedCode = vineFileCtx.fileMagicCode.toString()
    const sourceMap = vineFileCtx.fileMagicCode.generateMap({
      includeContent: true,
      hires: true,
      source: fileId,
    })

    callback(null, transformedCode, sourceMap as any)
  }
  catch (error) {
    callback(error as Error)
  }
}
