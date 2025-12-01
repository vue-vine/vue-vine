// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import { jsReady } from './lifecycle/js-ready'
import { executeMountToPage, isMountPending } from './renderer'

/**
 * Render the page - called by Lynx Native
 */
function renderPage(data: unknown): void {
  // Store initial data
  lynx.__initData = (data as Record<string, unknown>) || {}

  // Create Lynx page element
  const page = __CreatePage('0', 0)

  // Execute pending mount if app.mount() was called
  if (isMountPending()) {
    executeMountToPage(page)
  }
}

/**
 * Update the page - called by Lynx Native when data changes
 */
function updatePage(data: unknown, options?: UpdatePageOption): void {
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
function updateGlobalProps(_data: unknown, _options?: UpdatePageOption): void {
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
