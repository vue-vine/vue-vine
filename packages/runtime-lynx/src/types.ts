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
  function __CreatePage(componentId: string, cssId: number): FiberElement
  function __CreateElement(tag: string, parentComponentUniqueId: number, info?: object): FiberElement
  function __CreateView(parentComponentUniqueId: number): FiberElement
  function __CreateText(parentComponentUniqueId: number): FiberElement
  function __CreateRawText(s: string): FiberElement
  function __AppendElement(parent: FiberElement, child: FiberElement): FiberElement
  function __InsertElementBefore(parent: FiberElement, child: FiberElement, ref?: FiberElement): FiberElement
  function __RemoveElement(parent: FiberElement, child: FiberElement): FiberElement
  function __SetAttribute(e: FiberElement, key: string, value: any): void
  function __SetClasses(e: FiberElement, c: string): void
  function __AddInlineStyle(e: FiberElement, key: number | string, value: any): void
  function __AddEvent(e: FiberElement, eventType: string, eventName: string, event: any): void
  function __SetID(e: FiberElement, id: string | undefined | null): void
  function __FlushElementTree(element?: FiberElement, options?: FlushOptions): void
  function __OnLifecycleEvent(...args: any[]): void
  function _ReportError(error: Error, options: { errorCode: number }): void

  interface FiberElement {
    parentElement?: FiberElement
    children?: FiberElement[]
  }

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
