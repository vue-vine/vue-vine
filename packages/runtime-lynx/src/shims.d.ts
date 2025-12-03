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
  declare function __CreatePage(componentId: string, cssId: number): LynxElement
  declare function __CreateElement(tag: string, parentComponentUniqueId: number, info?: object): LynxElement
  declare function __CreateText(parentComponentUniqueId: number): LynxElement
  declare function __CreateImage(parentComponentUniqueId: number): LynxElement
  declare function __CreateView(parentComponentUniqueId: number): LynxElement
  declare function __CreateScrollView(parentComponentUniqueId: number): LynxElement
  declare function __CreateWrapperElement(parentComponentUniqueId: number): LynxElement
  declare function __CreateRawText(s: string): LynxElement
  declare function __CreateList(
    parentComponentUniqueId: number,
    componentAtIndex: ComponentAtIndexCallback,
    enqueueComponent: EnqueueComponentCallback,
    info?: any,
    componentAtIndexes: ComponentAtIndexesCallback,
  ): LynxElement
  declare function __AppendElement(parent: LynxElement, child: LynxElement): LynxElement
  declare function __InsertElementBefore(parent: LynxElement, child: LynxElement, ref?: LynxElement): LynxElement
  declare function __RemoveElement(parent: LynxElement, child: LynxElement): LynxElement
  declare function __FirstElement(parent: LynxElement): LynxElement | null
  declare function __NextElement(element: LynxElement): LynxElement | null
  declare function __GetParent(element: LynxElement): LynxElement | null
  declare function __SetAttribute(e: LynxElement, key: string, value: any): void
  declare function __SetClasses(e: LynxElement, c: string): void
  declare function __AddDataset(e: LynxElement, key: string, value: any): void
  declare function __AddInlineStyle(e: LynxElement, key: number | string, value: any): void
  declare function __AddEvent(e: LynxElement, eventType: string, eventName: string, event: any): void
  declare function __SetID(e: LynxElement, id: string | undefined | null): void
  declare function __SetInlineStyles(e: LynxElement, value: string | object): void
  declare function __FlushElementTree(e?: LynxElement, options?: FlushOptions): void
  declare function __OnLifecycleEvent(...args: any[]): void
  declare function __GetElementUniqueID(e: LynxElement): number
  declare function _ReportError(error: Error, options: { errorCode: number }): void

  // Lynx core inject object for background thread
  const lynxCoreInject: LynxCoreInject

  interface LynxCoreInject {
    tt: LynxTT
  }

  interface LynxTT {
    OnLifecycleEvent?: (event: [any, unknown]) => void
    publishEvent?: (handlerName: string, data: unknown) => void
    publicComponentEvent?: (componentId: string, handlerName: string, data: unknown) => void
    GlobalEventEmitter?: {
      emit: (eventName: string, data: unknown) => void
      trigger?: (eventName: string, data: unknown) => void
      addListener?: (eventName: string, listener: (...args: unknown[]) => void) => void
      removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void
    }
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
    __globalProps: Record<string, unknown>
    reportError: (e: Error) => void
    registerDataProcessors: (definition?: DataProcessorDefinition) => void
    getJSModule: (moduleName: string) => any
    getNativeApp: () => any
  }

  interface DataProcessorDefinition {
    defaultDataProcessor?: (data: any) => any
    dataProcessors?: Record<string, (data: any) => any>
  }
}

export {}
