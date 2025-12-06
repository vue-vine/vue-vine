// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

/**
 * Lynx Element PAPI and type declarations for Vue Vine
 */

declare global {
  // Build-time macros (will be replaced by DefinePlugin/SWC)
  const __MAIN_THREAD__: boolean
  const __BACKGROUND__: boolean
  const __LEPUS__: boolean
  const __DEV__: boolean

  // Lynx core inject object (background thread only)
  const lynxCoreInject: LynxCoreInject | undefined

  // Element type (FiberElement in Lynx)
  type LynxElement = any

  // ============================================
  // Element PAPI - Main thread only
  // ============================================

  function __CreatePage(componentId: string, cssId: number): LynxElement
  function __CreateElement(tag: string, parentComponentUniqueId: number, info?: object): LynxElement
  function __CreateText(parentComponentUniqueId: number): LynxElement
  function __CreateImage(parentComponentUniqueId: number): LynxElement
  function __CreateView(parentComponentUniqueId: number): LynxElement
  function __CreateFrame(parentComponentUniqueId: number): LynxElement
  function __CreateScrollView(parentComponentUniqueId: number): LynxElement
  function __CreateWrapperElement(parentComponentUniqueId: number): LynxElement
  function __CreateRawText(s: string): LynxElement
  function __CreateList(
    parentComponentUniqueId: number,
    componentAtIndex: ComponentAtIndexCallback,
    enqueueComponent: EnqueueComponentCallback,
    info?: any,
    componentAtIndexes?: ComponentAtIndexesCallback,
  ): LynxElement

  function __AppendElement(parent: LynxElement, child: LynxElement): LynxElement
  function __InsertElementBefore(parent: LynxElement, child: LynxElement, ref?: LynxElement): LynxElement
  function __RemoveElement(parent: LynxElement, child: LynxElement): LynxElement
  function __FirstElement(parent: LynxElement): LynxElement | null
  function __NextElement(element: LynxElement): LynxElement | null
  function __GetParent(element: LynxElement): LynxElement | null

  function __SetAttribute(e: LynxElement, key: string, value: any): void
  function __SetClasses(e: LynxElement, c: string): void
  function __AddDataset(e: LynxElement, key: string, value: any): void
  function __AddInlineStyle(e: LynxElement, key: number | string, value: any): void
  function __AddEvent(e: LynxElement, eventType: string, eventName: string, event: any): void
  function __SetID(e: LynxElement, id: string | undefined | null): void
  function __SetInlineStyles(e: LynxElement, value: string | object): void
  function __FlushElementTree(e?: LynxElement, options?: FlushOptions): void
  function __GetElementUniqueID(e: LynxElement): number
  function __OnLifecycleEvent(...args: any[]): void
  function _ReportError(error: Error, options: { errorCode: number }): void

  // ============================================
  // Cross-thread Communication
  // ============================================

  /**
   * Vue Vine event message format for cross-thread communication
   *
   * Background thread sends via: lynx.getCoreContext().dispatchEvent()
   * Main thread receives via: lynx.getJSContext().addEventListener()
   */
  interface VueVineEventMessage {
    type: 'vue-vine-event'
    handlerSign: string
    eventData: unknown
  }

  // ============================================
  // Callback Types
  // ============================================

  type ComponentAtIndexCallback = (
    list: LynxElement,
    listID: number,
    cellIndex: number,
    operationID: number,
    enableReuseNotification: boolean,
  ) => void

  type EnqueueComponentCallback = (
    list: LynxElement,
    listID: number,
    sign: number,
  ) => void

  type ComponentAtIndexesCallback = (
    list: LynxElement,
    listID: number,
    cellIndexes: number[],
    operationIDs: number[],
    enableReuseNotification: boolean,
    asyncFlush: boolean,
  ) => void

  // ============================================
  // Options Interfaces
  // ============================================

  interface FlushOptions {
    triggerLayout?: boolean
    pipelineOptions?: any
  }

  interface UpdatePageOption {
    resetPageData?: boolean
    reloadTemplate?: boolean
  }

  // ============================================
  // Lynx Lifecycle Functions
  // ============================================

  interface LynxCallByNative {
    renderPage: (data: any) => void
    updatePage: (data: any, options?: UpdatePageOption) => void
    updateGlobalProps: (data: any, options?: UpdatePageOption) => void
    getPageData: () => any
    removeComponents: () => void
  }

  interface DataProcessorDefinition {
    defaultDataProcessor?: (data: any) => any
    dataProcessors?: Record<string, (data: any) => any>
  }

  // ============================================
  // Global function declarations
  // ============================================

  /**
   * Vue Vine specific: Handle event forwarding from background thread
   * This is injected by entry-main.ts
   */
  function vueVineHandleEvent(message: VueVineEventMessage): void
}

export {}
