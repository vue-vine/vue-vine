// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Setup Lynx environment for main thread (Lepus)
 * This registers `processData` to globalThis
 */
export function setupLynxEnv(): void {
  // Initialize lynx.__initData
  lynx.__initData = {}

  // Setup error reporter
  lynx.reportError = function (e: Error) {
    _ReportError(e, {
      errorCode: 1101, // LYNX_ERROR_CODE_LEPUS
    })
  }

  // Register data processors - this creates globalThis.processData
  lynx.registerDataProcessors = function (
    dataProcessorDefinition?: DataProcessorDefinition,
  ) {
    let hasDefaultDataProcessorExecuted = false

    ;(globalThis as any).processData = (data: any, processorName?: string) => {
      let result: any
      try {
        if (processorName && dataProcessorDefinition?.dataProcessors?.[processorName]) {
          result = dataProcessorDefinition.dataProcessors[processorName](data)
        }
        else if (dataProcessorDefinition?.defaultDataProcessor) {
          result = dataProcessorDefinition.defaultDataProcessor(data)
        }
        else {
          result = data
        }
      }
      catch (e) {
        lynx.reportError(e as Error)
        result = {}
      }

      if (!hasDefaultDataProcessorExecuted) {
        hasDefaultDataProcessorExecuted = true
      }

      return result ?? {}
    }
  }

  // Register empty DataProcessors to ensure globalThis.processData exists
  lynx.registerDataProcessors()
}
