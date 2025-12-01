// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Lynx Element PAPI declarations
 * These are global functions provided by Lynx runtime
 */

declare global {
  // Build-time macros (will be replaced by loader)
  const __MAIN_THREAD__: boolean
  const __BACKGROUND__: boolean
  const __LEPUS__: boolean
  const __DEV__: boolean

  // Lynx global object
  const lynx: LynxGlobal

  // Element PAPI
  function __CreatePage(componentId: string, cssId: number): LynxElement
  function __CreateElement(tag: string, parentComponentUniqueId: number, info?: object): LynxElement
  function __CreateView(parentComponentUniqueId: number): LynxElement
  function __CreateText(parentComponentUniqueId: number): LynxElement
  function __CreateRawText(s: string): LynxElement
  function __AppendElement(parent: LynxElement, child: LynxElement): LynxElement
  function __InsertElementBefore(parent: LynxElement, child: LynxElement, ref?: LynxElement): LynxElement
  function __RemoveElement(parent: LynxElement, child: LynxElement): LynxElement
  function __SetAttribute(e: LynxElement, key: string, value: any): void
  function __SetClasses(e: LynxElement, c: string): void
  function __AddInlineStyle(e: LynxElement, key: number | string, value: any): void
  function __AddEvent(e: LynxElement, eventType: string, eventName: string, event: any): void
  function __SetID(e: LynxElement, id: string | undefined | null): void
  function __FlushElementTree(element?: LynxElement, options?: FlushOptions): void
  function __OnLifecycleEvent(...args: any[]): void
  function _ReportError(error: Error, options: { errorCode: number }): void

  interface FlushOptions {
    triggerLayout?: boolean
    pipelineOptions?: any
  }

  interface UpdatePageOption {
    resetPageData?: boolean
    reloadTemplate?: boolean
  }

  interface LynxCallByNative {
    renderPage: (data: any) => void
    updatePage: (data: any, options?: UpdatePageOption) => void
    updateGlobalProps: (data: any, options?: UpdatePageOption) => void
    getPageData: () => any
    removeComponents: () => void
  }

  interface LynxGlobal {
    __initData: Record<string, unknown>
    reportError: (e: Error) => void
    registerDataProcessors: (definition?: DataProcessorDefinition) => void
  }

  interface DataProcessorDefinition {
    defaultDataProcessor?: (data: any) => any
    dataProcessors?: Record<string, (data: any) => any>
  }
}

export {}
