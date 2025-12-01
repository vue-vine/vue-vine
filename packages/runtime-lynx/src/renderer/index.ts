// Copyright 2025 Vue Vine Team. All rights reserved.
// Licensed under the MIT License.

import type { App, Component, ComponentPublicInstance, Renderer } from 'vue'
import type { LynxElement } from '../types'
import { createRenderer } from 'vue'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

/**
 * Create Vue custom renderer for Lynx platform.
 * LynxElement is used as HostElement directly.
 */
const renderer: Renderer<LynxElement> = createRenderer<LynxElement, LynxElement>({
  ...nodeOps,
  patchProp,
})

const baseCreateApp = renderer.createApp

// Store app instance and mount state
let __app: App<LynxElement> | null = null
let __mountPending = false
let __mountedInstance: ComponentPublicInstance | null = null

/**
 * Extended App interface for Lynx platform
 * mount() doesn't require a container argument
 */
export interface LynxVueApp extends App<LynxElement> {
  mount: () => ComponentPublicInstance
}

/**
 * Create a Vue app instance for Lynx platform.
 * Usage:
 *   const app = createApp(App)
 *   app.mount()
 */
export function createLynxApp(rootComponent: Component, rootProps?: Record<string, unknown>): LynxVueApp {
  __app = baseCreateApp(rootComponent, rootProps)
  __mountPending = false
  __mountedInstance = null

  // Store original mount function
  const originalMount = __app.mount.bind(__app)

  // Override mount to work with Lynx lifecycle (no container needed)
  const mount = (): ComponentPublicInstance => {
    // Mark as pending mount, actual mount happens in renderPage
    __mountPending = true

    // Return a proxy that will be updated when actually mounted
    // For now return a placeholder, will be replaced in renderPage
    return __mountedInstance ?? ({} as ComponentPublicInstance)
  }

  // Store original mount for internal use
  ;(__app as any).__originalMount = originalMount

  // Return app with overridden mount
  return {
    ...__app,
    mount,
  } as LynxVueApp
}

/**
 * Get current app instance
 */
export function getApp(): App<LynxElement> | null {
  return __app
}

/**
 * Check if mount() has been called
 */
export function isMountPending(): boolean {
  return __mountPending
}

/**
 * Execute the actual mount to Lynx page element.
 * Called from renderPage lifecycle when page is ready.
 */
export function executeMountToPage(page: LynxElement): void {
  if (__app && __mountPending) {
    const originalMount = (__app as any).__originalMount as (container: LynxElement) => ComponentPublicInstance
    __mountedInstance = originalMount(page)
    __mountPending = false // Reset after mount is executed
  }
}

/**
 * Low-level render function
 */
export function render(...args: Parameters<typeof renderer.render>): ReturnType<typeof renderer.render> {
  return renderer.render(...args)
}
