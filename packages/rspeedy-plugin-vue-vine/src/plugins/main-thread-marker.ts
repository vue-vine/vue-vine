// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { Rspack } from '@rsbuild/core'
import { PLUGIN_NAME } from '../constants'

/**
 * Webpack plugin to mark main thread assets with 'lynx:main-thread' info.
 * This is required for LynxTemplatePlugin to correctly identify main thread code.
 */
export class MainThreadAssetMarkerPlugin {
  private mainThreadChunks: string[]
  private debug: boolean

  constructor(mainThreadChunks: string[], debug = false) {
    this.mainThreadChunks = mainThreadChunks
    this.debug = debug
  }

  apply(compiler: Rspack.Compiler): void {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation: Rspack.Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          for (const name of this.mainThreadChunks) {
            const asset = compilation.getAsset(name)
            if (!asset) {
              if (this.debug) {
                console.warn(`[${PLUGIN_NAME}] Main thread asset not found: ${name}`)
              }
              continue
            }

            // Mark asset as main thread for LynxTemplatePlugin
            compilation.updateAsset(
              asset.name,
              asset.source,
              {
                ...asset.info,
                'lynx:main-thread': true,
              },
            )

            if (this.debug) {
              console.log(`[${PLUGIN_NAME}] Marked asset as main-thread: ${name}`)
            }
          }
        },
      )
    })
  }
}
