// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { jsReady } from './lifecycle/js-ready'

// Current page element
let __page: FiberElement | null = null

/**
 * Render the page - called by Lynx Native
 */
function renderPage(data: any): void {
  // Store initial data
  lynx.__initData = data || {}

  // Create root page element
  __page = __CreatePage('0', 0)

  // For PoC: Create a simple view with text
  const view = __CreateView(0)
  const text = __CreateText(0)

  // Create raw text node and append to text element
  // This is the correct way to display text in Lynx
  const rawText = __CreateRawText('Hello from Vue Vine!')
  __AppendElement(text, rawText)

  __SetClasses(view, 'root-view')
  __AddInlineStyle(view, 'padding', '20px')
  __AddInlineStyle(view, 'background-color', '#f0f0f0')

  __AppendElement(view, text)
  __AppendElement(__page, view)

  // Flush element tree to render
  __FlushElementTree()
}

/**
 * Update the page - called by Lynx Native when data changes
 */
function updatePage(data: any, options?: UpdatePageOption): void {
  if (options?.resetPageData) {
    lynx.__initData = {}
  }

  if (typeof data === 'object' && data !== null) {
    Object.assign(lynx.__initData, data)
  }

  // Flush to apply changes
  __FlushElementTree()
}

/**
 * Update global props
 */
function updateGlobalProps(_data: any, _options?: UpdatePageOption): void {
  // Simply flush the element tree
  // Note: UpdatePageOption is not directly compatible with FlushOptions
  __FlushElementTree()
}

/**
 * Inject native-callable functions to globalThis
 */
export function injectCalledByNative(): void {
  const calledByNative: LynxCallByNative = {
    renderPage,
    updatePage,
    updateGlobalProps,
    getPageData: () => lynx.__initData,
    removeComponents: () => {},
  }

  Object.assign(globalThis, calledByNative)
  Object.assign(globalThis, { jsReady })
}
